import { createStructuredSelector, createSelector } from 'reselect';
import isEmpty from 'lodash/isEmpty';
import groupBy from 'lodash/groupBy';
import castArray from 'lodash/castArray';
import sortBy from 'lodash/sortBy';
import take from 'lodash/take';
import { ALL_SELECTED, API, METRIC, SECTOR_TOTAL } from 'constants';

import { getTranslate } from 'selectors/translation-selectors';

import {
  getEmissionsData,
  getFieldQuery,
  getMetadataData,
  getSelectedAPI,
  getTop10EmittersOptionLabel
} from './historical-emissions-get-selectors';

const { COUNTRY_ISO } = process.env;

export const findOption = (
  options,
  value,
  findBy = [ 'name', 'value', 'code', 'label' ]
) =>
  options && options
      .filter(o => o)
      .find(
        o => castArray(findBy).some(key => String(o[key]) === String(value))
      );

// OPTIONS
const CHART_TYPE_OPTIONS = [
  { label: 'area', value: 'area' },
  { label: 'line', value: 'line' }
];

const SOURCE_OPTIONS = [
  {
    label: 'SIGN SMART',
    name: 'SIGN SMART',
    value: 'SIGN_SMART',
    api: API.indo
  },
  { label: 'CAIT', name: 'CAIT', value: 'CAIT', api: API.cw }
];

export const getAllSelectedOption = createSelector([ getTranslate ], t => ({
  value: ALL_SELECTED,
  label: t('common.all-selected-option'),
  override: true
}));

export const getNationalOption = createSelector(
  [ getTranslate, getMetadataData ],
  (t, meta) => {
    if (!meta) return null;

    return {
      ...findOption(meta.location, COUNTRY_ISO, 'iso_code3'),
      code: COUNTRY_ISO,
      label: t('pages.national-context.historical-emissions.region.national'),
      override: true
    };
  }
);

const getBreakByOptions = createSelector([ getTranslate ], t => {
  const options = t('pages.national-context.historical-emissions.break-by', {
    default: {}
  });
  return Object
    .keys(options)
    .map(optionKey => ({ label: options[optionKey], value: optionKey }));
});

const getFieldOptions = field =>
  createSelector(
    [
      getMetadataData,
      getSelectedAPI,
      getTop10EmittersOption,
      getNationalOption
    ],
    (metadata, api, top10EmmmitersOption, nationalOption) => {
      if (!metadata || !metadata[field]) return null;

      const transformToOption = o => ({
        label: o.label,
        value: String(o.value),
        code: o.iso_code3 || o.code || o.label
      });

      let options = metadata[field];

      switch (field) {
        case 'sector': {
          if (api === API.cw) {
            options = options
              .filter(d => isEmpty(d.aggregated_sector_ids))
              .filter(d => !d.parent_id);
          }
          break;
        }
        case 'location': {
          options = options.filter(o => o.iso_code3 !== COUNTRY_ISO);
          options = [ nationalOption, top10EmmmitersOption, ...options ];
          break;
        }
        default:
      }

      return options.filter(o => o).map(transformToOption);
    }
  );

const getTop10EmittersIsoCodes = emissionData => {
  const groupedByISO = groupBy(emissionData, 'iso_code3');

  const totalEmissionByProvince = Object
    .keys(groupedByISO)
    .filter(iso => iso !== COUNTRY_ISO)
    .map(iso => {
      const totalEmissionValue = groupedByISO[iso].find(
        p => p.metric === METRIC.absolute && p.sector === SECTOR_TOTAL
      ) ||
        0;

      return { iso, value: totalEmissionValue };
    });
  return take(sortBy(totalEmissionByProvince, 'value').map(p => p.iso), 10);
};

export const getTop10EmittersOption = createSelector(
  [ getEmissionsData, getMetadataData, getTop10EmittersOptionLabel ],
  (data, meta, top10Label) => {
    if (!data || isEmpty(data) || !meta || !meta.location) return null;

    const top10ISOs = getTop10EmittersIsoCodes(data);
    if (top10ISOs.length !== 10) return null;

    const getLocationValuesforISOs = isos =>
      isos
        .map(iso => (findOption(meta.location, iso, 'iso_code3') || {}).value)
        .join();

    return {
      label: top10Label,
      value: getLocationValuesforISOs(top10ISOs),
      override: true
    };
  }
);

export const getTop10EmittersOptionExpanded = createSelector(
  [ getMetadataData, getTop10EmittersOption ],
  (meta, top10EmittersOption) => {
    if (!top10EmittersOption) return null;

    return top10EmittersOption.value.split(',').map(value => {
      const location = meta.location.find(
        l => String(l.value) === String(value)
      );
      return { label: location.label, value, code: location.iso_code3 };
    });
  }
);

// SELECTED
const getFieldSelected = field =>
  createSelector(
    [
      getFieldQuery(field),
      getDefaults,
      getFilterOptions,
      getAllSelectedOption
    ],
    (queryValue, defaults, options, allSelectedOption) => {
      if (!queryValue) return defaults[field];
      if (queryValue === ALL_SELECTED) return allSelectedOption;
      const findSelectedOption = value => findOption(options[field], value);
      return queryValue.includes(',')
        ? queryValue.split(',').map(v => findSelectedOption(v))
        : findSelectedOption(queryValue);
    }
  );

export const getFilterOptions = createStructuredSelector({
  source: () => SOURCE_OPTIONS,
  breakBy: getBreakByOptions,
  region: getFieldOptions('location'),
  sector: getFieldOptions('sector'),
  gas: getFieldOptions('gas'),
  chartType: () => CHART_TYPE_OPTIONS
});

// DEFAULTS
const getDefaults = createSelector(
  [ getFilterOptions, getNationalOption, getAllSelectedOption ],
  (options, nationalOption, allSelectedOption) => ({
    source: findOption(SOURCE_OPTIONS, 'SIGN SMART'),
    chartType: findOption(CHART_TYPE_OPTIONS, 'line'),
    breakBy: findOption(options.breakBy, 'region-absolute'),
    region: nationalOption,
    sector: allSelectedOption,
    gas: findOption(options.gas, 'All GHG')
  })
);

const filterSectorSelectedByMetrics = createSelector(
  [
    getFieldSelected('sector'),
    getFieldOptions('sector'),
    getFieldSelected('breakBy')
  ],
  (sectorSelected, sectorOptions, breakBy) => {
    if (!sectorOptions || !breakBy) return null;
    if (!breakBy.value.endsWith('absolute')) {
      return sectorOptions.find(o => o.code === SECTOR_TOTAL) || sectorSelected;
    }
    return sectorSelected;
  }
);

export const getSelectedOptions = createStructuredSelector({
  source: getFieldSelected('source'),
  chartType: getFieldSelected('chartType'),
  breakBy: getFieldSelected('breakBy'),
  region: getFieldSelected('region'),
  sector: filterSectorSelectedByMetrics,
  gas: getFieldSelected('gas')
});

const getBreakBySelected = createSelector(getSelectedOptions, options => {
  if (!options || !options.breakBy) return null;
  const breakByArray = options.breakBy.value.split('-');
  return { modelSelected: breakByArray[0], metricSelected: breakByArray[1] };
});

export const getModelSelected = createSelector(
  getBreakBySelected,
  breakBySelected => breakBySelected && breakBySelected.modelSelected || null
);
export const getMetricSelected = createSelector(
  getBreakBySelected,
  breakBySelected => breakBySelected && breakBySelected.metricSelected || null
);
