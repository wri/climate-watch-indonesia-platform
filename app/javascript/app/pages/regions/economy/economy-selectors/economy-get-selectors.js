import { createSelector } from 'reselect';
import { getFieldQuery } from 'selectors/filters-selectors';
import { API } from 'constants';

export const getWBData = ({ WorldBank }) => WorldBank.data || null;
export const getEmissionsData = ({ GHGEmissions }) =>
  GHGEmissions && GHGEmissions.data || null;
export const getTargetEmissionsData = ({ GHGTargetEmissions }) =>
  GHGTargetEmissions && GHGTargetEmissions.data || null;

export const getSelectedAPI = createSelector(
  [ getFieldQuery('source') ],
  sourceQuery => sourceQuery === 'CAIT' ? API.cw : API.indo
);

const _getMetadata = ({ metadata }) => {
  console.log('metadata', metadata)
  return metadata
}

export const getMetadata = createSelector([ _getMetadata, getSelectedAPI ], (
  metadata,
  api
) =>
  {
    if (!metadata) return null;
    const meta = api === API.cw ? 'ghgcw' : 'ghgindo';
    return metadata[meta];
  });

export const getMetadataData = createSelector(
  getMetadata,
  meta => {
    console.log('meta data data', meta)
    return meta && meta.data
  }
);
