import { Request, Response } from 'express';

import { User, ProfileDetail } from '../models';
import { errorResponse, notFoundResponse, successResponse, validationError } from '../helpers/api-responses';
import utils from '../helpers/utils';
import { UploadedFile } from 'express-fileupload';

const updateProfileDetail = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { personalDetail, aadharCard, panCard, bankDetail, emergencyContact } = req.body;

    const profileImage = req.files?.profilePic as UploadedFile;
    const panCardImage = req.files?.panCardPic as UploadedFile;
    const aadharCardImage = req.files?.aadharCardPic as UploadedFile;

    if (aadharCard?.number && !utils.validateAadharNumber(aadharCard.number)) {
      return validationError(res, 'Invalid Aadhar card number');
    }
    if (panCard?.number && !utils.validatePanNumber(panCard.number)) {
      return validationError(res, 'Invalid PAN card number');
    }
    if (bankDetail?.accountNumber && !utils.validateBankAccountNumber(bankDetail.accountNumber)) {
      return validationError(res, 'Invalid account number');
    }
    if (bankDetail?.ifscCode && !utils.validateIFSCCode(bankDetail.ifscCode)) {
      return validationError(res, 'Invalid IFSC code');
    }

    let profilePicData, aadharPicData, panPicData;

    if (profileImage) {
      const profilePicUrl = await utils.uploadToCloudinary(profileImage.tempFilePath, 'profilePics');
      if (!profilePicUrl) {
        return errorResponse(res, 'Profile picture upload failed');
      }
      profilePicData = {
        fileUrl: profilePicUrl,
        fileName: profileImage.name,
        fileType: profileImage.mimetype,
        fileSize: profileImage.size,
      };
    }

    if (aadharCardImage) {
      const aadharPicUrl = await utils.uploadToCloudinary(aadharCardImage.tempFilePath, 'aadharCards');
      if (!aadharPicUrl) {
        return errorResponse(res, 'Aadhar card upload failed');
      }
      aadharPicData = {
        fileUrl: aadharPicUrl,
        fileName: aadharCardImage.name,
        fileType: aadharCardImage.mimetype,
        fileSize: aadharCardImage.size,
      };
    }

    if (panCardImage) {
      const panPicUrl = await utils.uploadToCloudinary(panCardImage.tempFilePath, 'panCards');
      if (!panPicUrl) {
        return errorResponse(res, 'PAN card upload failed');
      }
      panPicData = {
        fileUrl: panPicUrl,
        fileName: panCardImage.name,
        fileType: panCardImage.mimetype,
        fileSize: panCardImage.size,
      };
    }

    const existingProfileDetail = await ProfileDetail.findOne({ userId: user._id });

    const profileDetailData = {
      personalDetail: {
        ...existingProfileDetail?.personalDetail,
        ...personalDetail,
        profilePic: profilePicData || existingProfileDetail?.personalDetail?.profilePic,
      },
      aadharCard: {
        ...existingProfileDetail?.aadharCard,
        ...aadharCard,
        file: aadharPicData || existingProfileDetail?.aadharCard?.file,
      },
      panCard: {
        ...existingProfileDetail?.panCard,
        ...panCard,
        file: panPicData || existingProfileDetail?.panCard?.file,
      },
      bankDetail: {
        ...existingProfileDetail?.bankDetail,
        ...bankDetail,
      },
      emergencyContact: {
        ...existingProfileDetail?.emergencyContact,
        ...emergencyContact,
      },
    };

    if (existingProfileDetail) {
      const profileDetail = await ProfileDetail.findOneAndUpdate({ userId: user._id }, profileDetailData, { new: true });
      return successResponse(res, 'Profile detail updated successfully', profileDetail);
    } else {
      const profileDetail = await ProfileDetail.create({
        companyId: user.companyId,
        userId: user._id,
        ...profileDetailData,
      });
      return successResponse(res, 'Profile detail added successfully', profileDetail);
    }
  } catch (error: any) {
    console.error('Error updating profile detail:', error);
    return errorResponse(res, error.message);
  }
};

const getProfileDetail = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const profileDetail = await ProfileDetail.findOne({ userId: user._id }).populate('userId');
    if (!profileDetail) {
      return successResponse(res, 'Profile detail not found', null);
    }

    return successResponse(res, 'Profile detail fetched successfully', profileDetail);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default { updateProfileDetail, getProfileDetail };
