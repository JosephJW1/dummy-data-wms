module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define("Stock", {
    productId: { type: DataTypes.INTEGER, allowNull: false },
    locationId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.FLOAT, allowNull: false },
    palletRef: { type: DataTypes.BIGINT, allowNull: false },
    status: { 
      type: DataTypes.ENUM("Received", "Available", "Allocated", "Picked", "Hold"), // <-- Added here
      defaultValue: "Available", 
      allowNull: false 
    },
    pickListId: { type: DataTypes.INTEGER, allowNull: true }, 
    holdReason: { type: DataTypes.ENUM("QCHold", "PalletMissing"), allowNull: true } 
  });
  return Stock;
};