const { DataTypes } = require('sequelize');

/**
 * Layout storage:
 * - rows=50, cols=80
 * - rowLabels: computed (A..AX), not stored
 * - segmentsByRow: JSON array length=50.
 *   Each row is an array like [start1,end1,start2,end2,...] (0-based col indices, inclusive).
 * - seatTypeByRowSegment: optional parallel structure for per-segment seatType code
 *   For MVP: store as JSON, same shape as segmentsByRow, but pairs become objects.
 */
function defineHallLayout(sequelize) {
  const HallLayout = sequelize.define(
    'HallLayout',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      hallId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      rows: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 50 },
      cols: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 80 },

      // Array< Array<number> >
      segmentsByRow: { type: DataTypes.JSON, allowNull: false },

      // Optional: Array< Array<{start:number,end:number,type:string}> >
      typedSegmentsByRow: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'hall_layouts', underscored: true }
  );

  return HallLayout;
}

module.exports = { defineHallLayout };

