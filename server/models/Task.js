module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define("Task", {
    stockId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    locationToId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      type: DataTypes.ENUM("Put Away", "Pick", "Replenishment", "Load", "Dispatch"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Allocated", "Completed"),
      defaultValue: "Allocated",
      allowNull: false,
    },
    assignedUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  });
  return Task;
};