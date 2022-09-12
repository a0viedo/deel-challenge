const request = require('supertest')
const app = require('../app')
const { seed, contract1: createdContract1 } = require('../utils')
const { Profile, Contract, Job } = require('../model')

describe('Endpoints', () => {
  beforeEach(async () => {
    await seed()
  })

  describe('get a contract', () => {
    it('should run as expected', async () => {
      const res = await request(app).get('/contracts/1').set('profile_id', 1)
      expect(res.statusCode).toEqual(200)
      expect(res.body).toMatchObject(createdContract1)
    })

    it('should return 404 if a contract does not belong to the profile id', async () => {
      const res = await request(app).get('/contracts/1').set('profile_id', 3)
      expect(res.statusCode).toEqual(404)
    })
  })

  describe('get list of contracts', () => {
    it('should work as expected', async () => {
      const res = await request(app).get('/contracts').set('profile_id', 1)
      expect(res.statusCode).toEqual(200)
      expect(res.body.length).toEqual(1)
      expect(res.body[0].id).toEqual(2)
    })
  })

  describe('get list of unpaid jobs', () => {
    it('should work as expected', async () => {
      const res = await request(app).get('/jobs/unpaid').set('profile_id', 1)
      expect(res.statusCode).toEqual(200)
      expect(res.body.length).toEqual(1)
      expect(res.body).toMatchObject([{ id: 2 }])
    })

    it('should get an empty list', async () => {
      const res = await request(app).get('/jobs/unpaid').set('profile_id', 100)
      expect(res.statusCode).toEqual(200)
      expect(res.body.length).toEqual(0)
    })
  })

  describe('pay job', () => {
    it('should work as expected', async () => {
      const client = await Profile.findOne({
        where: {
          id: 1,
        },
      })
      const prevClientBalance = client.balance
      const job = await Job.findOne({
        where: {
          id: 1,
        },
        include: [{
          model: Contract,
          include: [{
            model: Profile,
            as: 'Contractor',
          }],
        }],
      })
      const prevContractorBalance = job.Contract.Contractor.balance
      const res = await request(app).post('/jobs/1/pay').set('profile_id', 1)

      await Promise.all([client.reload(), job.reload()])
      expect(client.balance).toEqual(prevClientBalance - job.price)
      expect(job.paid).toEqual(true)
      expect(job.Contract.Contractor.balance).toEqual(prevContractorBalance + job.price)
      expect(res.statusCode).toEqual(204)
    })

    it('should not allow to pay for jobs that are already paid', async () => {
      const res = await request(app).post('/jobs/6/pay').set('profile_id', 4)
      expect(res.statusCode).toEqual(400)
      expect(res.body).toMatchObject({
        message: 'Job already paid',
      })
    })

    it('should not allow to pay if the balance of the client is less than the price', async () => {
      const res = await request(app).post('/jobs/5/pay').set('profile_id', 4)
      expect(res.statusCode).toEqual(400)
      expect(res.body).toMatchObject({
        message: 'Insufficient balance',
      })
    })

    it('should not be able to pay if the client is not in the contract for that job', async () => {
      const res = await request(app).post('/jobs/5/pay').set('profile_id', 1)
      expect(res.statusCode).toEqual(400)
    })
  })

  describe('add to balance', () => {
    it('should work as expected', async () => {
      const client = await Profile.findOne({
        where: {
          id: 1,
        },
      })
      const prevClientBalance = client.balance
      const res = await request(app).post('/balances/deposit/1').send({
        amount: 100,
      })
      expect(res.statusCode).toEqual(200)
      await client.reload()
      expect(client.balance).toEqual(prevClientBalance + 100)
    })

    it('it should not be able to sucessfully update a balance concurrently', async () => {
      const res = await Promise.all([request(app).post('/balances/deposit/1').send({
        amount: 100,
      }), request(app).post('/balances/deposit/1').send({
        amount: 100,
      })])
      expect(res[0].statusCode === 423 || res[1].statusCode === 423).toEqual(true)
    })

    it('should not be able to add a balance greater than the 25% of jobs to pay', async () => {
      const res = await request(app).post('/balances/deposit/1').send({
        amount: 10000,
      })

      expect(res.statusCode).toEqual(400)
    })
  })

  describe('get best profession', () => {
    it('should work as expected', async () => {
      const result = await request(app).get('/admin/best-profession').query({
        start: new Date('2019-01-01').toISOString(),
        end: new Date('2022-01-01').toISOString(),
      })
      expect(result.body.profession).toEqual('Programmer') // nice wink huh
    })
  })

  describe('get best clients', () => {
    it('should work as expected', async () => {
      const result = await request(app).get('/admin/best-clients').query({
        start: new Date('2019-01-01').toISOString(),
        end: new Date('2022-01-01').toISOString(),
      })
      expect(result.body.length).toEqual(2)
      expect(result.body[0]).toMatchObject({
        fullName: 'Ash Ketchum',
      })
      expect(result.body[1]).toMatchObject({
        fullName: 'Mr Robot',
      })
    })
  })
})
