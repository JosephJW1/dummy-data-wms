module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define("Location", {
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chamberId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  });
  return Location;
};