const Sequelize = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.NODE_ENV === 'test' ? ':memory:' : './database.sqlite3',
  logging: process.env.NODE_ENV === 'test' ? false : console.log,
})

class Profile extends Sequelize.Model {}
Profile.init(
  {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    profession: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    balance: {
      type: Sequelize.DECIMAL(12, 2),
    },
    type: {
      type: Sequelize.ENUM('client', 'contractor'),
    },
    version: { // Optimistic Locking
      allowNull: false,
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Profile',
    version: true,
  },
)

class Contract extends Sequelize.Model {}
Contract.init(
  {
    terms: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('new', 'in_progress', 'terminated'),
    },
    version: { // Optimistic Locking
      allowNull: false,
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Contract',
    version: true,
  },
)

class Job extends Sequelize.Model {}
Job.init(
  {
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    },
    paid: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    paymentDate: {
      type: Sequelize.DATE,
    },
    version: { // Optimistic Locking
      allowNull: false,
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Job',
    version: true,
  },
)

Profile.hasMany(Contract, { as: 'Contractor', foreignKey: 'ContractorId' })
Contract.belongsTo(Profile, { as: 'Contractor' })
Profile.hasMany(Contract, { as: 'Client', foreignKey: 'ClientId' })
Contract.belongsTo(Profile, { as: 'Client' })
Contract.hasMany(Job)
Job.belongsTo(Contract)

module.exports = {
  sequelize,
  Profile,
  Contract,
  Job,
}
