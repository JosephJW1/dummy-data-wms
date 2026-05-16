module.exports = (sequelize, DataTypes) => {
  const Chamber = sequelize.define("Chamber", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  });
  return Chamber;
};