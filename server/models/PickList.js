module.exports = (sequelize, DataTypes) => {
  const PickList = sequelize.define("PickList", {
    ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dispatchDate: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  });
  return PickList;
};