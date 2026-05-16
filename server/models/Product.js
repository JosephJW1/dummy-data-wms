module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define("Product", {
    code: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pickFaceLocationId: {
      type: DataTypes.INTEGER,
      allowNull: true, 
    },
    fullPalletQnt: {
      type: DataTypes.INTEGER,
      allowNull: false, 
    },
    unitOfMeasurement: {
      type: DataTypes.ENUM("kg", "case"),
      allowNull: false,
    },
    reorderTriggerQuantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0, 
    },
    demandLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  });
  return Product;
};