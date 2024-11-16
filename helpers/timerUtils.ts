import { Document, PipelineStage } from 'mongoose';
import moment from 'moment';

import Timer from '../models/Timer';
import OnlineUser from '../models/OnlineUser';
import utils from './utils';
import {
  getDailyAndWeeklyHourQuery,
  getTimerActivityQuery,
  getTimelineActivityQuery,
  getDsrWithFiltersQuery,
  getDsrForUserQuery,
  getTotalHoursQuery,
} from '../query/timer';
import { DailyWeeklyHourPipeline } from '../types';
import { DSR } from '../models';
import { DsrAggregateResult } from '../types/dsr';

// get users who were not checked out and update their endTime
const userAutoCheckout = async (): Promise<void> => {
  try {
    // get the actice time cycles which were not checked out
    const activeTimer: Document[] = await Timer.find({ endTime: null });
    if (activeTimer.length === 0) {
      return;
    }
    // collect their checkinIds
    const checkinIds: string[] = activeTimer.map(doc => doc._id) as string[];

    // get all the online users using the checkinIds and updatedAt time > 10 minutes
    const onlineUsers = await OnlineUser.find({
      checkinId: { $in: checkinIds },
      updatedAt: { $lt: utils.getTenMinutesAgoTime() },
    });

    // update the endTime for all the above online users
    for (const user of onlineUsers) {
      const unixTime = utils.convertDateToUnix(user.updatedAt!);
      await Timer.findByIdAndUpdate(user.checkinId, { endTime: unixTime });
    }
  } catch (err) {
    console.log('Error in userAutoCheckout:', err);
  }
};

//get user dailyHours and weekHours for checkIn and checkOut
const getDailyAndWeeklyHours = async (userId: any, startTime?: number, endTime?: number) => {
  let startTimestamp: number;
  let endTimestamp: number;

  if (startTime && endTime) {
    startTimestamp = startTime;
    endTimestamp = endTime;
  } else {
    startTimestamp = utils.getDefaultStartTime();
    endTimestamp = utils.getDefaultEndTime();
  }

  // Calculate the start and end dates of the current week
  const startOfWeek = moment().startOf('isoWeek').unix();
  const endOfWeek = moment().endOf('isoWeek').unix();

  try {
    const dailyWeeklyHourQuery: DailyWeeklyHourPipeline = getDailyAndWeeklyHourQuery(startTimestamp, endTimestamp, startOfWeek, endOfWeek, userId);

    const result = await Timer.aggregate(dailyWeeklyHourQuery as PipelineStage[]);

    const dailyResult = result[0].daily;
    const weeklyResult = result[0].weekly;

    return {
      dailyWorkHours: dailyResult[0]?.dailyWorkHours || '00:00:00',
      weeklyWorkHours: weeklyResult[0]?.weeklyWorkHours || '00:00:00',
    };
  } catch (error) {
    console.error('Aggregation error (combined):', error);
    throw new Error('Failed to calculate hours');
  }
};

const getDsrForUser = async (userId: string): Promise<DsrAggregateResult[]> => {
  const startOfDay = moment().startOf('day').unix();
  const endOfDay = moment().endOf('day').unix();

  const pipeline: PipelineStage[] = getDsrForUserQuery(startOfDay, endOfDay, userId);

  const timers = await Timer.aggregate(pipeline);
  return timers;
};

const getDsrWithFilters = async (startDate: Date, endDate: Date, memberIds?: string[]): Promise<any[]> => {
  const pipeline = getDsrWithFiltersQuery(startDate, endDate, memberIds);

  const result = await DSR.aggregate(pipeline);
  return result;
};

const getTimerActivityData = async (
  startTime: number,
  endTime: number,
  limit: number,
  offset: number,
  searchText?: string,
  projectId?: Array<string>,
  memberId?: Array<string>,
) => {
  try {
    const pipeline: PipelineStage[] = getTimerActivityQuery(startTime, endTime, limit, offset, searchText, projectId, memberId);

    const [result] = await Timer.aggregate(pipeline as PipelineStage[]);

    const totalRecords = result.totalRecords || 0;
    const data = result.data || [];

    return { totalRecords, data };
  } catch (error: any) {
    console.error('Error in getTimerActivityData:', error);
    throw new Error('Failed to get timer activity data');
  }
};

const getTimelineActivity = async (startTime: number, endTime: number, userId: string) => {
  try {
    const pipeline: PipelineStage[] = getTimelineActivityQuery(startTime, endTime, userId);

    const result = await Timer.aggregate(pipeline as PipelineStage[]);
    return result;
  } catch (error: any) {
    console.error('Error in getTimelineActivity:', error);
    throw new Error('Failed to get timeline activity');
  }
};

const getTotalHours = async (userId: any, startTime: number, endTime: number) => {
  try {
    const totalHoursQuery: PipelineStage[] = getTotalHoursQuery(userId, startTime, endTime);

    const result = await Timer.aggregate(totalHoursQuery as PipelineStage[]);

    return { totalHours: result[0]?.totalHours || '00:00' };
  } catch (error) {
    console.error('Aggregation error (combined):', error);
    throw new Error('Failed to calculate hours');
  }
};

export { userAutoCheckout, getDailyAndWeeklyHours, getDsrForUser, getDsrWithFilters, getTimerActivityData, getTimelineActivity, getTotalHours };
