import { PipelineStage } from "mongoose";

// Define the match stage type
export type MatchStage = {
  $match: {
    [key: string]: any;
  };
};

// Define the lookup stage type
export type LookupStage = {
  $lookup: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  };
};

export type GroupStage = {
  $group: {
    _id: any; // Group by field or expression
    [key: string]: any; // Other fields to accumulate or calculate
  };
};

// Project Stage
export type ProjectStage = {
  $project: {
    [key: string]: any; // Fields to include or exclude in the output
  };
};

// Define the unwind stage type
export type UnwindStage = {
  $unwind: {
    path: string;
    preserveNullAndEmptyArrays?: boolean;
  };
};

// Define the sort stage type
export type SortStage = {
  $sort: {
    [key: string]: 1 | -1;
  };
};

export type SkipStage = {
  $skip: number;
};

export type LimitStage = {
  $limit: number;
};

export type FacetStage = {
  $facet: {
    [key: string]: PipelineStage[]; // Facet pipelines
  };
};

export type CountStage = {
  $count: string; // Name of the count field
};
