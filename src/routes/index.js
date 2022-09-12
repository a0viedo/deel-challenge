const express = require('express')
const Sequelize = require('sequelize')
const { getProfile } = require('../middleware/getProfile')
const { sequelize } = require('../model')

const router = express.Router()

router.get('/contracts/:id', getProfile, async (req, res) => {
  const { Contract, Profile } = req.app.get('models')
  const { id } = req.params
  const contract = await Contract.findOne({
    where: {
      id,
      [Sequelize.Op.or]: [{
        '$Contractor.id$': req.get('profile_id'),
      }, {
        '$Client.id$': req.get('profile_id'),
      }],
    },
    include: [
      { model: Profile, as: 'Contractor' },
      { model: Profile, as: 'Client' },
    ],
  })
  if (!contract) return res.status(404).end()
  res.json(contract)
})

router.get('/contracts', async (req, res) => {
  const { Contract, Profile } = req.app.get('models')
  const list = await Contract.findAll({
    where: {
      [Sequelize.Op.or]: [{
        '$Contractor.id$': req.get('profile_id'),
      }, {
        '$Client.id$': req.get('profile_id'),
      }],
      status: {
        [Sequelize.Op.ne]: 'terminated',
      },
    },
    include: [
      { model: Profile, as: 'Contractor' },
      { model: Profile, as: 'Client' },
    ],
  })
  return res.json(list)
})

router.get('/jobs/unpaid', async (req, res) => {
  const { Job, Profile, Contract } = req.app.get('models')
  const jobList = await Job.findAll({
    where: {
      [Sequelize.Op.or]: [{
        '$Contract.Contractor.id$': req.get('profile_id'),
      }, {
        '$Contract.Client.id$': req.get('profile_id'),
      }],
      paid: false,
      '$Contract.status$': 'in_progress',
    },
    include: [{
      model: Contract,
      include: [
        { model: Profile, as: 'Contractor' },
        { model: Profile, as: 'Client' },
      ],
    }],
  })
  return res.json(jobList)
})

router.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
  const { Job, Profile, Contract } = req.app.get('models')

  if (req.profile.type !== 'client') {
    return res.status(404).end()
  }

  const job = await Job.findOne({
    where: {
      id: req.params.job_id,
      '$Contract.Client.id$': req.get('profile_id'),
    },
    include: [{
      model: Contract,
      include: [
        { model: Profile, as: 'Client' },
        { model: Profile, as: 'Contractor' },
      ],
    }],
  })
  if (!job) {
    return res.status(400).json({
      message: 'Invalid job id',
    })
  }
  if (job.paid === true) {
    return res.status(400).json({
      message: 'Job already paid',
    })
  }
  if (req.profile.balance - job.price < 0) {
    return res.status(400).json({
      message: 'Insufficient balance',
    })
  }

  try {
    await sequelize.transaction(async (t) => {
      await req.profile.update({
        balance: req.profile.balance - job.price,
      }, { transaction: t })

      await job.Contract.Contractor.update({
        balance: job.Contract.Contractor.balance + job.price,
      }, {
        transaction: t,
      })
    })
    await job.update({
      paid: true,
    })
    return res.status(204).end()
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

router.post('/balances/deposit/:userId', async (req, res) => {
  const { Job, Profile, Contract } = req.app.get('models')
  const { amount } = req.body
  const { userId } = req.params

  const client = await Profile.findOne({
    where: {
      id: userId,
      type: 'client',
    },
  })

  if (!client) {
    return res.status(400).json({
      message: 'Invalid userId',
    })
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      message: 'Invalid amount',
    })
  }

  const jobs = await Job.findAll({
    where: {
      '$Contract.Client.id$': userId,
      paid: false,
    },
    attributes: [[Sequelize.fn('sum', Sequelize.col('price')), 'totalToPay']],
    include: [{
      model: Contract,
      attributes: [],
      include: [
        { model: Profile, as: 'Client', attributes: [] },
      ],
    }],
  })
  if (!jobs || jobs.length === 0) {
    return res.status(400).json({
      message: 'Invalid request',
    })
  }
  if (((jobs[0].dataValues.totalToPay / 100) * 25) < amount) {
    return res.status(400).json({
      message: 'Balance exceeds limit',
    })
  }
  try {
    await client.update({
      balance: client.balance + amount,
    })

    return res.json({
      balance: client.balance,
    })
  } catch (error) {
    if (error.name === 'SequelizeOptimisticLockError') {
      return res.status(423).end()
    }
    return res.status(500).end()
  }
})

router.get('/admin/best-profession', async (req, res) => {
  const { Job, Profile, Contract } = req.app.get('models')

  const results = await Job.findAll({
    where: {
      paymentDate: {
        [Sequelize.Op.and]: [{
          [Sequelize.Op.gte]: req.query.start,
        }, {
          [Sequelize.Op.lt]: req.query.end,
        }],
      },
    },
    attributes: [[Sequelize.fn('sum', Sequelize.col('price')), 'totalEarned']],
    include: [{
      model: Contract,
      attributes: [],
      include: [
        { model: Profile, as: 'Contractor', attributes: ['profession'] },
      ],
    }],
    group: ['Contract.Contractor.profession'],
    raw: true,
    order: Sequelize.literal('totalEarned DESC'),
  })

  if (results.length === 0) {
    return res.json({})
  }

  return res.json({
    totalEarned: results[0].totalEarned,
    profession: results[0]['Contract.Contractor.profession'],
  })
})

router.get('/admin/best-clients', async (req, res) => {
  const { Job, Profile, Contract } = req.app.get('models')
  const limit = req.query.limit || 2
  const results = await Job.findAll({
    where: {
      paid: true,
      paymentDate: {
        [Sequelize.Op.and]: [{
          [Sequelize.Op.gte]: req.query.start,
        }, {
          [Sequelize.Op.lt]: req.query.end,
        }],
      },
    },
    attributes: [[Sequelize.fn('sum', Sequelize.col('price')), 'totalPaid']],
    include: [{
      model: Contract,
      attributes: [],
      include: [
        { model: Profile, as: 'Client', attributes: ['firstName', 'lastName'] },
      ],
    }],
    group: ['Contract.Client.id'],
    raw: true,
    order: Sequelize.literal('totalPaid DESC'),
    limit,
  })

  return res.json(results.map((e) => ({
    id: e['Contract.Client.id'],
    totalPaid: e.totalPaid,
    fullName: `${e['Contract.Client.firstName']} ${e['Contract.Client.lastName']}`,
  })))
})

module.exports = router
