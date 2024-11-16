import { subDays, isWeekend } from 'date-fns';

import Holiday from '../models/Holiday';
import Timer from '../models/Timer';
import Compoff from '../models/Compoff';
import constants from './constants';
import utils from './utils';

const creditDailyCompoff = async () => {
  const date = new Date();
  const previousDay = subDays(date, 1);
  console.log('previousDay', previousDay);

  // 1. Check if the previous day was a holiday or a weekend
  const isHoliday = await Holiday.exists({ date: previousDay });
  if (!isHoliday && !isWeekend(previousDay)) {
    console.log('previousDay is not a holiday and not a weekend');
    return; // 2. If no, then do nothing
  }

  // 3. Check if any user has worked on that day
  const startTime = utils.startOfDayUnix(previousDay);
  const endTime = utils.endOfDayUnix(previousDay);
  console.log('startTime', startTime);
  console.log('endTime', endTime);

  const workTimers = await Timer.find({
    startTime: { $gte: startTime, $lte: endTime },
    type: constants.TIMER_TYPE.WORK,
  });
  console.log('workTimers', workTimers);
  if (workTimers.length === 0) {
    console.log('no work timers found');
    return; // 4. If no, then do nothing
  }

  // 5. Calculate the number of hours worked by each user
  const userWorkHours = new Map<string, number>();

  for (const timer of workTimers) {
    const userId = timer.userId.toString();
    const duration = (timer.endTime || Date.now()) - timer.startTime;
    const hours = Math.round(duration / (1000 * 60 * 60));
    userWorkHours.set(userId, (userWorkHours.get(userId) || 0) + hours);
  }

  console.log('userWorkHours', userWorkHours);

  // 6 & 7. Determine eligible compoff based on hours worked
  for (const [userId, hours] of userWorkHours) {
    let eligibleCompoff: number = 0;
    console.log('userId', userId);
    console.log('hours', hours);
    if (hours >= 6) {
      eligibleCompoff = constants.COMPOFF_COUNT.FULL;
    } else if (hours >= 3) {
      eligibleCompoff = constants.COMPOFF_COUNT.HALF;
    } else {
      return; // do nothing if less than 3 hours
    }
    console.log('eligibleCompoff', eligibleCompoff);

    // 8. Create a compoff entry for the user
    await Compoff.create({
      companyId: workTimers[0].companyId, // Assuming all timers have the same companyId
      userId,
      compoffType: constants.COMPOFF_TYPE.DAILY,
      workDate: previousDay,
      trackedHours: hours,
      eligibleCompoff,
      status: constants.COMPOFF_STATUS.PENDING,
    });
  }
};

const creditMonthlyCompoff = async () => {
  const date = new Date();
  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  console.log('previousMonth', previousMonth);
  const startOfMonth = utils.startOfDayUnix(previousMonth);
  const endOfMonth = utils.endOfDayUnix(new Date(date.getFullYear(), date.getMonth(), 0));
  console.log('startOfMonth', startOfMonth);
  console.log('endOfMonth', endOfMonth);

  // 1. Calculate total working days in the previous month (exclude weekends and holidays)
  const totalDays = await calculateWorkingDays(startOfMonth, endOfMonth);
  console.log('totalDays', totalDays);
  // 2. Calculate total working hours in the previous month
  const totalWorkingHours = totalDays * 8;
  const totalWorkingHoursWithBuffer = totalWorkingHours + 8;
  console.log('totalWorkingHoursWithBuffer', totalWorkingHoursWithBuffer);

  // 3. Calculate total working hours (TWH) for all users in that month
  const users = await Timer.aggregate([
    {
      $match: {
        startTime: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$userId',
        totalHours: { $sum: { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 3600] } },
      },
    },
    {
      $project: {
        _id: 1,
        totalHours: { $round: ['$totalHours', 2] },
      },
    },
  ]);

  //   4-8. Process compoff for each user
  for (const user of users) {
    let eligibleCompoff = 0;

    if (user.totalHours >= totalWorkingHoursWithBuffer + 4) {
      eligibleCompoff = constants.COMPOFF_COUNT.FULL;
    } else if (user.totalHours >= totalWorkingHoursWithBuffer && user.totalHours < totalWorkingHoursWithBuffer + 4) {
      eligibleCompoff = constants.COMPOFF_COUNT.HALF;
    } else if (user.totalHours < totalWorkingHoursWithBuffer - 4) {
      eligibleCompoff = -constants.COMPOFF_COUNT.FULL;
    } else if (user.totalHours < totalWorkingHoursWithBuffer - 4 && user.totalHours >= totalWorkingHoursWithBuffer - 8) {
      eligibleCompoff = -constants.COMPOFF_COUNT.HALF;
    }

    if (user.totalHours >= totalWorkingHoursWithBuffer) {
      await Compoff.create({
        companyId: user.companyId,
        userId: user._id,
        compoffType: constants.COMPOFF_TYPE.MONTHLY,
        workDate: previousMonth,
        totalHours: totalWorkingHours,
        trackedHours: user.totalHours,
        eligibleCompoff,
        status: constants.COMPOFF_STATUS.PENDING,
      });
    }
  }
};

const calculateWorkingDays = async (startTime: number, endTime: number) => {
  const holidays = await Holiday.find({
    date: { $gte: new Date(startTime * 1000), $lte: new Date(endTime * 1000) },
  });

  let workingDays = 0;
  for (let day = startTime; day <= endTime; day += 86400) {
    const currentDate = new Date(day * 1000);
    if (!isWeekend(currentDate) && !holidays.some(h => h.date.getTime() === currentDate.getTime())) {
      workingDays++;
    }
  }

  return workingDays;
};

export default { creditDailyCompoff, creditMonthlyCompoff };
