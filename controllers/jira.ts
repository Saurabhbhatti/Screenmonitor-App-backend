import { Request, Response } from 'express';
import axios from 'axios';

import { User } from '../models';
import { errorResponse, notFoundResponse, successResponse } from '../helpers/api-responses';
import utils from '../helpers/utils';

const getJiraIssues = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }
    // JQL Query to find issues assigned to the user
    const jql = `assignee="${user.email}"`;

    const jiraURL = `${process.env.JIRA_BASE_URL}/rest/api/3/search?jql=${jql}`;

    // Make the request to JIRA API
    const response = await axios.get(jiraURL, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
        Accept: 'application/json',
      },
    });

    const customResponse: any = [];
    if (response.data.issues.length > 0) {
      response.data.issues.filter((issue: any) => {
        customResponse.push({
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          priority: issue.fields.priority.name,
          assignee: issue.fields.assignee.displayName,
          reporter: issue.fields.reporter.displayName,
          description: issue.fields.description,
          created: issue.fields.created,
          updated: issue.fields.updated,
        });
      });
    }

    return successResponse(res, 'JIRA issues fetched successfully', customResponse);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

// Add time log to JIRA issue
const addWorklog = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { issueId, timeSpent, comment } = req.body;

    const worklogData = {
      comment: {
        content: [
          {
            content: [
              {
                text: comment || '',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      },
      started: '2024-10-15T12:34:00.000+0000',
      timeSpentSeconds: timeSpent,
    };

    const jiraURL = `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueId}/worklog`;

    // Make the request to JIRA API
    const response = await axios.post(jiraURL, worklogData, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return successResponse(res, 'Worklog added successfully', response.data);
  } catch (error: any) {
    console.log('error', error);
    return errorResponse(res, error.message);
  }
};

export default { getJiraIssues, addWorklog };
