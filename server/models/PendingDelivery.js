module.exports = (sequelize, DataTypes) => {
  const PendingDelivery = sequelize.define("PendingDelivery", {
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    targetDate: {
      type: DataTypes.DATEONLY, 
      allowNull: false,
    },
    targetHour: {
      type: DataTypes.INTEGER, // e.g., 6 for 06:00 AM
      allowNull: false,
    },
    targetMinute: {
      type: DataTypes.INTEGER, // e.g., 15 for XX:15
      allowNull: false,
    },
    assignedUserId: {
      type: DataTypes.INTEGER, // Links to the Admin who processed it
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Pending", "Completed"),
      defaultValue: "Pending",
      allowNull: false,
    }
  });

  return PendingDelivery;
};