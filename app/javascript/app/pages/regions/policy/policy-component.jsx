import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import SectionTitle from 'components/section-title';
import InfoDownloadToolbox from 'components/info-download-toolbox';
import Chart from 'components/chart';
import { Dropdown, Button, Icon, Table } from 'cw-components';
import dropdownStyles from 'styles/dropdown';
import shareIcon from 'assets/icons/share';
import PoliciesProvider from 'providers/policies-provider';

import castArray from 'lodash/castArray';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import styles from './policy-styles';


class Policy extends PureComponent {
  handleFilterChange = selected => {
    const { onFilterChange, selectedOptions } = this.props;

    const prevSelectedOptionValues = castArray(selectedOptions.indicator).map(
      o => o.value
    );

    const selectedArray = castArray(selected);
    const newSelectedOption = selectedArray.find(
      o => !prevSelectedOptionValues.includes(o.value)
    );

    const removedAnyPreviousOverride = selectedArray
      .filter(v => v)
      .filter(v => !v.override);

    const values = newSelectedOption && newSelectedOption.override
      ? newSelectedOption.value
      : uniq(
        flatMap(removedAnyPreviousOverride, v => String(v.value).split(','))
      ).join(',');

    onFilterChange({ indicator: values });
  };

  renderCardData(field) {
    const { goals, objectives } = this.props;
    const data = field === 'goals' ? goals : objectives;
    return (
      <ul>
        {data.map((item, index) => <li key={index}>- {item}</li>)}
      </ul>
    );
  }

  renderDropdown() {
    const { selectedOptions, filterOptions, t } = this.props;
    const value = selectedOptions && selectedOptions.indicator;
    const options = filterOptions.indicator || [];

    const label = t(`pages.regions.policy.section-two.labels.indicator}`);

    return (
      <Dropdown
        key="indicator"
        label={label}
        options={options}
        onValueChange={selected => this.handleFilterChange(selected)}
        value={value || null}
        theme={{ select: dropdownStyles.select }}
        hideResetButton
      />
    );
  }

  renderChart() {
    const { chartData } = this.props;
    if (!chartData || !chartData.data) return null;

    return (
      <Chart
        type='line'
        config={chartData.config}
        theme={chartData.config.theme}
        data={chartData.data}
        dataOptions={chartData.dataOptions}
        dataSelected={chartData.dataSelected}
        loading={false}
        height={500}
        onLegendChange={v => this.handleLegendChange(v)}
        showUnit
      />
    );
  }

  renderTable() {
    const { tableData, tableConfig } = this.props
    if (!tableData) return null

    const setColumnWidth = () => 250

    return (
      <Table
        data={tableData}
        hasColumnSelect
        parseMarkdown
        firstColumnHeaders={tableConfig.firstColumnHeaders}
        narrowColumns={tableConfig.narrowColumns}
        emptyValueLabel='Data belum tersedia'
        defaultColumns={tableConfig.defaultColumns}
        horizontalScroll
        dinamicRowsHeight
        shouldOverflow
        setColumnWidth={setColumnWidth}
      />
    )
  }

  render() {
    const { t, params, filterOptions } = this.props;

    const test = t(`pages.regions.policy.section-one.goals.content`);
    return (
      <div className={styles.page}>
        <div className={styles.chartMapContainer}>
          <div>
            <SectionTitle
              title={t('pages.regions.policy.section-one.title')}
              description={t('pages.regions.policy.section-one.description')}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div>
              <Button theme={{ button: cx(styles.button) }}>
                <p>Share | <Icon icon={shareIcon} /></p>
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.cardContainer}>
          <div>
            <SectionTitle
              title={t('pages.regions.policy.section-one.goals.title')}
            />
            <p>
              {t('pages.regions.policy.section-one.goals.description')}
            </p>
            <br />
            <div className={styles.card}>
              {this.renderCardData('goals')}
            </div>
          </div>
          <div>
            <SectionTitle
              title={t('pages.regions.policy.section-one.objectives.title')}
            />
            <p>
              {t('pages.regions.policy.section-one.objectives.description')}
            </p>
            <br />
            <div className={styles.card}>
              {this.renderCardData('objectives')}
            </div>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <div className={styles.chartMapContainer}>
            <div>
              <SectionTitle title="Alur Kebijakan" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <InfoDownloadToolbox
                className={{ buttonWrapper: styles.buttonWrapper }}
                slugs="sources"
                downloadUri="downloadURI"
                pdfUri="pdfuri"
                shareableLink="link"
              />
            </div>
          </div>
          <div style={{ width: '25%' }}>
            {this.renderDropdown()}
          </div>
          <div className={styles.chartContainer}>
            {this.renderChart()}
            {this.renderTable()}
          </div>
        </div>
        {params && <PoliciesProvider params={params} />}
      </div>
    );
  }
}

Policy.propTypes = {
  t: PropTypes.func.isRequired,
  provinceISO: PropTypes.string
};

Policy.defaultProps = {};

export default Policy;
