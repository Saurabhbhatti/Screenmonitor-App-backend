import mongoose, { PipelineStage } from 'mongoose';

export const getProductivityQuery = (userId: string, isMonthly: string | boolean, startTime?: number, endTime?: number): PipelineStage[] => {
  const currentYear = new Date().getFullYear();

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (isMonthly || isMonthly === 'true') {
    matchStage.createdAt = {
      $gte: new Date(currentYear, 0, 1),
      $lt: new Date(currentYear + 1, 0, 1),
    };
  } else if (startTime && endTime) {
    matchStage.createdAt = { $gte: new Date(Number(startTime) * 1000), $lte: new Date(Number(endTime) * 1000) };
  }
  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    {
      $group: {
        _id:
          isMonthly || isMonthly === 'true'
            ? { $dateToString: { format: '%B', date: '$createdAt' } }
            : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalMouseClicks: { $sum: '$totalMouseClicks' },
        totalKeyStrokes: { $sum: '$totalKeyStrokes' },
        totalMouseScrolls: { $sum: '$totalMouseScrolls' },
        totalMinutes: { $sum: '$totalMinutes' },
      },
    },
  ];

  return pipeline;
};
