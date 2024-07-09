import Timer from '../models/Timer.js';
import OnlineUser from '../models/OnlineUser.js';

import { getTenMinutesAgoTime, convertDateToUnix } from './utils.js';

// get users who were not checked out and update their endTime
export const userAutoCheckout = async () => {
  try {
    // get the actice time cycles which were not checked out
    const activeTimer = await Timer.find({ endTime: null });
    if (activeTimer.length === 0) {
      return;
    }
    // collect their checkinIds
    const checkinIds = activeTimer.map((doc) => doc._id);

    // get all the online users using the checkinIds and updatedAt time > 10 minutes
    const onlineUsers = await OnlineUser.find({
      checkinId: { $in: checkinIds },
      updatedAt: { $gt: getTenMinutesAgoTime() },
    });

    // update the endTime for all the above online users
    for (const user of onlineUsers) {
      const unixTime = convertDateToUnix(user.updatedAt);
      await Timer.findByIdAndUpdate(user.checkinId, { endTime: unixTime });
    }
  } catch (err) {
    console.log('Error in userAutoCheckout:', err);
  }
};
