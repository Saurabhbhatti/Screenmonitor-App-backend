const successResponse = (res, msg, data) => {
    let resData = {
      status: true,
      message: msg,
      data: data,
    };
    return res.status(200).json(resData);
  };
  
  const successResponseDataWithPagination = (res, msg, total, data) => {
    let resData = {
      status: true,
      message: msg,
      totalUsers: total,
      data: data,
    };
    return res.status(200).json(resData);
  };

  const successResponseDataWithfilters = (res, msg, total, data,filterData) => {
    let resData = {
      status: true,
      message: msg,
      totalUsers: total,
      data: data,
      filterData:filterData
    };
    return res.status(200).json(resData);
  };
  
  const errorResponse = (res, msg) => {
    var resData = {
      status: false,
      message: msg,
      data: null,
    };
    return res.status(500).json(resData);
  };
  
  const notFoundResponse = (res, msg) => {
    var resData = {
      status: false,
      message: msg,
      data: null,
    };
    return res.status(404).json(resData);
  };
  
  const validationError = (res, msg, data) => {
    var resData = {
      status: false,
      message: msg,
      data: data,
    };
    return res.status(400).json(resData);
  };
  
  const unauthorizedResponse = (res, msg) => {
    var resData = {
      status: false,
      message: msg,
      data: null,
    };
    return res.status(401).json(resData);
  };

  export {
    successResponse,
    successResponseDataWithPagination,
    errorResponse,
    notFoundResponse,
    validationError,
    unauthorizedResponse,
    successResponseDataWithfilters,
  };
  