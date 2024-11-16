import User from '../models/User';
import { getUsersWithProjectsQuery } from '../query/user';
import { FilterOptions } from '../types';

export const getUsersWithProjectsAggregate = async (
  filter: FilterOptions,
  limit: number,
  offset: number
) => {
  const pipeline = getUsersWithProjectsQuery(filter, limit, offset);
  return await User.aggregate(pipeline);
};
