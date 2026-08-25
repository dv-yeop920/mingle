const convertGroupTypeForStorage = (groupType: string) =>
  groupType === 'company' ? 'work' : groupType;

export { convertGroupTypeForStorage };
