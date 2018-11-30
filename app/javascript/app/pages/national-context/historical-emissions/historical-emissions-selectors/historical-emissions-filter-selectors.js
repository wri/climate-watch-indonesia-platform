import { createStructuredSelector, createSelector } from 'reselect';
import isEmpty from 'lodash/isEmpty';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import take from 'lodash/take';
import {
  ALL_SELECTED,
  ALL_SELECTED_OPTION,
  METRIC_OPTIONS
} from 'constants/constants';

import {
  getMetadata,
  getEmissionsData,
  getDefaultTop10EmittersOption,
  getTop10EmitterSplittedOptions,
  getQuery
} from './historical-emissions-get-selectors';

const findOption = (options, value) =>
  options &&
    options.find(
      o =>
        String(o.value) === String(value) ||
          o.name === value ||
          o.label === value
    );

// OPTIONS
const CHART_TYPE_OPTIONS = [
  { label: 'area', value: 'area' },
  { label: 'line', value: 'line' }
];
const BREAK_BY_OPTIONS = [
  {
    label: 'Province - Absolute',
    value: `provinces-${METRIC_OPTIONS.ABSOLUTE_VALUE.value}`
  },
  {
    label: 'Province - Per GDP',
    value: `provinces-${METRIC_OPTIONS.PER_GDP.value}`
  },
  {
    label: 'Province - Per Capita',
    value: `provinces-${METRIC_OPTIONS.PER_CAPITA.value}`
  },
  {
    label: 'Sector - Absolute',
    value: `sector-${METRIC_OPTIONS.ABSOLUTE_VALUE.value}`
  },
  {
    label: 'Sector - Per GDP',
    value: `sector-${METRIC_OPTIONS.PER_CAPITA.value}`
  },
  {
    label: 'Sector - Per Capita',
    value: `sector-${METRIC_OPTIONS.PER_GDP.value}`
  },
  {
    label: 'Gas - Absolute',
    value: `gas-${METRIC_OPTIONS.ABSOLUTE_VALUE.value}`
  },
  { label: 'Gas - Per GDP', value: `gas-${METRIC_OPTIONS.PER_GDP.value}` },
  { label: 'Gas - Per Capita', value: `gas-${METRIC_OPTIONS.PER_CAPITA.value}` }
];

const getFieldOptions = field => createSelector(getMetadata, metadata => {
  if (!metadata || !metadata[field]) return null;
  if (field === 'dataSource') {
    return metadata[field].map(o => ({
      name: o.label,
      value: String(o.value)
    }));
  }
  return metadata[field].map(o => ({ label: o.label, value: String(o.value) }));
});

// Only to calculate top 10 emitters option
const getSectorSelected = createSelector([ getQuery, getMetadata ], (
  query,
  metadata
) =>
  {
    if (!query || !metadata) return null;
    const sectorLabel = value => {
      const sectorObject = metadata.sector.find(s => String(s.value) === value);
      return sectorObject && sectorObject.label;
    };
    const { sector } = query;
    return !sector || sector === ALL_SELECTED
      ? ALL_SELECTED
      : sector.split(',').map(value => sectorLabel(value));
  });

export const getTop10EmittersOption = createSelector(
  [
    getDefaultTop10EmittersOption,
    getSectorSelected,
    getEmissionsData,
    getMetadata
  ],
  (defaultTop10, sectorSelected, data, meta) => {
    if (!data || isEmpty(data) || !sectorSelected || !meta || !meta.location)
      return defaultTop10;
    const selectedData = sectorSelected === ALL_SELECTED
      ? data
      : data.filter(d => sectorSelected.includes(d.sector));
    const groupedSelectedData = groupBy(selectedData, 'location');
    const provinces = [];
    Object.keys(groupedSelectedData).forEach(provinceName => {
      if (provinceName === 'Indonesia') return;
      const emissionsValue = groupedSelectedData[provinceName].reduce(
        (accumulator, p) => {
          const lastYearEmission = p.emissions[p.emissions.length - 1].value;
          return accumulator + lastYearEmission;
        },
        0
      );
      provinces.push({ name: provinceName, value: emissionsValue });
    });
    const top10 = take(sortBy(provinces, 'value').map(p => p.name), 10);
    if (top10.length !== 10) return defaultTop10;
    const getLocationValuesforOption = option => {
      const value = option.value
        .split(',')
        .map(name => findOption(meta.location, name).value)
        .join();
      return { label: option.label, value };
    };
    return getLocationValuesforOption(top10);
  }
);

const addExtraOptions = field =>
  createSelector([ getFieldOptions(field), getTop10EmittersOption ], (
    options,
    top10EmmmitersOption
  ) =>
    {
      if (!options) return null;
      if (field === 'dataSource') {
        // Remove when we have CAIT. Just for showcase purpose
        const fakeCAITOption = { name: 'CAIT', value: '100' };
        return options.concat(fakeCAITOption);
      }
      if (field === 'location') return [ top10EmmmitersOption, ...options ];
      return options;
    });

export const getFilterOptions = createStructuredSelector({
  source: addExtraOptions('dataSource'),
  chartType: () => CHART_TYPE_OPTIONS,
  breakBy: () => BREAK_BY_OPTIONS,
  provinces: addExtraOptions('location'),
  sector: getFieldOptions('sector'),
  gas: getFieldOptions('gas')
});

// DEFAULTS
const getDefaults = createSelector(
  [ getFilterOptions, getTop10EmitterSplittedOptions ],
  (options, top10EmmmitersOptions) => ({
    source: findOption(options.source, 'SIGN SMART'),
    chartType: findOption(CHART_TYPE_OPTIONS, 'line'),
    breakBy: findOption(
      BREAK_BY_OPTIONS,
      `provinces-${METRIC_OPTIONS.ABSOLUTE_VALUE.value}`
    ),
    provinces: top10EmmmitersOptions,
    sector: ALL_SELECTED_OPTION,
    gas: ALL_SELECTED_OPTION
  })
);

// SELECTED
const getFieldSelected = field => state => {
  const { query } = state.location;
  if (!query || !query[field]) return getDefaults(state)[field];
  const queryValue = String(query[field]);
  if (queryValue === ALL_SELECTED) return ALL_SELECTED_OPTION;
  const findSelectedOption = value =>
    findOption(getFilterOptions(state)[field], value);
  return queryValue.includes(',')
    ? queryValue.split(',').map(v => findSelectedOption(v))
    : findSelectedOption(queryValue);
};

const filterSectorSelectedByMetrics = createSelector(
  [
    getFieldSelected('sector'),
    getFieldOptions('sector'),
    getFieldSelected('breakBy')
  ],
  (sectorSelected, sectorOptions, breakBy) => {
    if (!sectorOptions || !breakBy) return null;
    if (!breakBy.value.endsWith(METRIC_OPTIONS.ABSOLUTE_VALUE.value)) {
      return sectorOptions.find(o => o.label === 'Total') || sectorSelected;
    }
    return sectorSelected;
  }
);

export const getSelectedOptions = createStructuredSelector({
  source: getFieldSelected('source'),
  chartType: getFieldSelected('chartType'),
  breakBy: getFieldSelected('breakBy'),
  provinces: getFieldSelected('provinces'),
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