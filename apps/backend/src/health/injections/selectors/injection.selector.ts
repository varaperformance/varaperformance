export const injectionProtocolSelect = {
  id: true,
  userId: true,
  encryptedData: true,
  dataIv: true,
  dataAuthTag: true,
  wrappedKey: true,
  createdAt: true,
  updatedAt: true,
};
export type InjectionProtocolSelect = typeof injectionProtocolSelect;

export const injectionLogSelect = {
  id: true,
  userId: true,
  protocolId: true,
  encryptedData: true,
  dataIv: true,
  dataAuthTag: true,
  wrappedKey: true,
  loggedAt: true,
  createdAt: true,
};
export type InjectionLogSelect = typeof injectionLogSelect;
