module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define("Transaction", {
    stockId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    locationFromId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    locationToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    palletRefFrom: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    palletRefTo: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    pickListId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("Received", "Put Away", "Picked", "Replenished", "Loaded", "Dispatched"),
      allowNull: false,
    },
    completedByUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });
  return Transaction;
};