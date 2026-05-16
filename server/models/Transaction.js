module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define("Transaction", {
    stockId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    locationToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    palletRefTo: {
      type: DataTypes.BIGINT,
      allowNull: false,
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