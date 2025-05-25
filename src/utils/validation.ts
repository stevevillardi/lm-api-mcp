import Joi from 'joi';

// Device validation schemas
export const listDevicesSchema = Joi.object({
  filter: Joi.string().optional(),
  size: Joi.number().min(1).max(1000).optional(),
  offset: Joi.number().min(0).optional(),
  fields: Joi.string().optional()
});

export const getDeviceSchema = Joi.object({
  deviceId: Joi.number().required()
});

export const createDeviceSchema = Joi.object({
  displayName: Joi.string().required(),
  hostName: Joi.string().required(),
  hostGroupIds: Joi.array().items(Joi.number()).min(1).required(),
  preferredCollectorId: Joi.number().required(),
  disableAlerting: Joi.boolean().optional(),
  properties: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })
  ).optional()
});

export const updateDeviceSchema = Joi.object({
  deviceId: Joi.number().required(),
  displayName: Joi.string().optional(),
  hostGroupIds: Joi.array().items(Joi.number()).optional(),
  disableAlerting: Joi.boolean().optional(),
  customProperties: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })
  ).optional()
});

export const deleteDeviceSchema = Joi.object({
  deviceId: Joi.number().required()
});

// Device Group validation schemas
export const listDeviceGroupsSchema = Joi.object({
  filter: Joi.string().optional(),
  fields: Joi.string().optional(),
  parentId: Joi.number().optional()
});

export const getDeviceGroupSchema = Joi.object({
  groupId: Joi.number().required()
});

export const createDeviceGroupSchema = Joi.object({
  name: Joi.string().required(),
  parentId: Joi.number().required(),
  description: Joi.string().optional(),
  appliesTo: Joi.string().optional(),
  properties: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })
  ).optional()
});

export const updateDeviceGroupSchema = Joi.object({
  groupId: Joi.number().required(),
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  appliesTo: Joi.string().optional(),
  customProperties: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })
  ).optional()
});

export const deleteDeviceGroupSchema = Joi.object({
  groupId: Joi.number().required(),
  deleteChildren: Joi.boolean().optional()
});

// Collector validation schemas
export const listCollectorsSchema = Joi.object({
  filter: Joi.string().optional(),
  size: Joi.number().min(1).max(1000).optional(),
  offset: Joi.number().min(0).optional(),
  fields: Joi.string().optional()
});