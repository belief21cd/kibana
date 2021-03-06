/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MissingMonitoringDataAlert } from './missing_monitoring_data_alert';
import { ALERT_MISSING_MONITORING_DATA } from '../../common/constants';
import { fetchMissingMonitoringData } from '../lib/alerts/fetch_missing_monitoring_data';
import { fetchClusters } from '../lib/alerts/fetch_clusters';

const RealDate = Date;

jest.mock('../lib/alerts/fetch_missing_monitoring_data', () => ({
  fetchMissingMonitoringData: jest.fn(),
}));
jest.mock('../lib/alerts/fetch_clusters', () => ({
  fetchClusters: jest.fn(),
}));

describe('MissingMonitoringDataAlert', () => {
  it('should have defaults', () => {
    const alert = new MissingMonitoringDataAlert();
    expect(alert.type).toBe(ALERT_MISSING_MONITORING_DATA);
    expect(alert.label).toBe('Missing monitoring data');
    expect(alert.defaultThrottle).toBe('6h');
    // @ts-ignore
    expect(alert.defaultParams).toStrictEqual({ limit: '1d', duration: '15m' });
    // @ts-ignore
    expect(alert.actionVariables).toStrictEqual([
      { name: 'stackProducts', description: 'The stack products missing monitoring data.' },
      { name: 'count', description: 'The number of stack products missing monitoring data.' },
      {
        name: 'internalShortMessage',
        description: 'The short internal message generated by Elastic.',
      },
      {
        name: 'internalFullMessage',
        description: 'The full internal message generated by Elastic.',
      },
      { name: 'state', description: 'The current state of the alert.' },
      { name: 'clusterName', description: 'The cluster to which the nodes belong.' },
      { name: 'action', description: 'The recommended action for this alert.' },
      {
        name: 'actionPlain',
        description: 'The recommended action for this alert, without any markdown.',
      },
    ]);
  });

  describe('execute', () => {
    function FakeDate() {}
    FakeDate.prototype.valueOf = () => 1;

    const clusterUuid = 'abc123';
    const clusterName = 'testCluster';
    const stackProduct = 'elasticsearch';
    const stackProductUuid = 'esNode1';
    const stackProductName = 'esName1';
    const gapDuration = 3000001;
    const missingData = [
      {
        stackProduct,
        stackProductUuid,
        stackProductName,
        clusterUuid,
        gapDuration,
      },
      {
        stackProduct: 'kibana',
        stackProductUuid: 'kibanaUuid1',
        stackProductName: 'kibanaInstance1',
        clusterUuid,
        gapDuration: gapDuration + 10,
      },
    ];
    const getUiSettingsService = () => ({
      asScopedToClient: jest.fn(),
    });
    const getLogger = () => ({
      debug: jest.fn(),
    });
    const monitoringCluster = null;
    const config = {
      ui: {
        ccs: { enabled: true },
        container: { elasticsearch: { enabled: false } },
        metricbeat: { index: 'metricbeat-*' },
      },
    };
    const kibanaUrl = 'http://localhost:5601';

    const replaceState = jest.fn();
    const scheduleActions = jest.fn();
    const getState = jest.fn();
    const executorOptions = {
      services: {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn().mockImplementation(() => {
          return {
            replaceState,
            scheduleActions,
            getState,
          };
        }),
      },
      state: {},
    };

    beforeEach(() => {
      // @ts-ignore
      Date = FakeDate;
      (fetchMissingMonitoringData as jest.Mock).mockImplementation(() => {
        return missingData;
      });
      (fetchClusters as jest.Mock).mockImplementation(() => {
        return [{ clusterUuid, clusterName }];
      });
    });

    afterEach(() => {
      Date = RealDate;
      replaceState.mockReset();
      scheduleActions.mockReset();
      getState.mockReset();
    });

    it('should fire actions', async () => {
      const alert = new MissingMonitoringDataAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl,
        false
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 2;
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            ccs: undefined,
            cluster: { clusterUuid, clusterName },
            gapDuration,
            stackProduct,
            stackProductName,
            stackProductUuid,
            ui: {
              isFiring: true,
              message: {
                text:
                  'For the past an hour, we have not detected any monitoring data from the Elasticsearch node: esName1, starting at #absolute',
                nextSteps: [
                  {
                    text: '#start_linkView all Elasticsearch nodes#end_link',
                    tokens: [
                      {
                        startToken: '#start_link',
                        endToken: '#end_link',
                        type: 'link',
                        url: 'elasticsearch/nodes',
                      },
                    ],
                  },
                  {
                    text: 'Verify monitoring settings on the node',
                  },
                ],
                tokens: [
                  {
                    startToken: '#absolute',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 0,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
          {
            ccs: undefined,
            cluster: { clusterUuid, clusterName },
            gapDuration: gapDuration + 10,
            stackProduct: 'kibana',
            stackProductName: 'kibanaInstance1',
            stackProductUuid: 'kibanaUuid1',
            ui: {
              isFiring: true,
              message: {
                text:
                  'For the past an hour, we have not detected any monitoring data from the Kibana instance: kibanaInstance1, starting at #absolute',
                nextSteps: [
                  {
                    text: '#start_linkView all Kibana instances#end_link',
                    tokens: [
                      {
                        startToken: '#start_link',
                        endToken: '#end_link',
                        type: 'link',
                        url: 'kibana/instances',
                      },
                    ],
                  },
                  {
                    text: 'Verify monitoring settings on the instance',
                  },
                ],
                tokens: [
                  {
                    startToken: '#absolute',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 0,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `We have not detected any monitoring data for 2 stack product(s) in cluster: testCluster. [View what monitoring data we do have for these stack products.](http://localhost:5601/app/monitoring#/overview?_g=(cluster_uuid:abc123))`,
        internalShortMessage: `We have not detected any monitoring data for 2 stack product(s) in cluster: testCluster. Verify these stack products are up and running, then double check the monitoring settings.`,
        action: `[View what monitoring data we do have for these stack products.](http://localhost:5601/app/monitoring#/overview?_g=(cluster_uuid:abc123))`,
        actionPlain:
          'Verify these stack products are up and running, then double check the monitoring settings.',
        clusterName,
        count,
        stackProducts: 'Elasticsearch node: esName1, Kibana instance: kibanaInstance1',
        state: 'firing',
      });
    });

    it('should not fire actions if under threshold', async () => {
      (fetchMissingMonitoringData as jest.Mock).mockImplementation(() => {
        return [
          {
            ...missingData[0],
            gapDuration: 1,
          },
        ];
      });
      const alert = new MissingMonitoringDataAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl,
        false
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: {
              clusterUuid,
              clusterName,
            },
            gapDuration: 1,
            stackProduct,
            stackProductName,
            stackProductUuid,
            ui: {
              isFiring: false,
              lastCheckedMS: 0,
              message: null,
              resolvedMS: 0,
              severity: 'danger',
              triggeredMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).not.toHaveBeenCalled();
    });

    it('should resolve with a resolved message', async () => {
      (fetchMissingMonitoringData as jest.Mock).mockImplementation(() => {
        return [
          {
            ...missingData[0],
            gapDuration: 1,
          },
        ];
      });
      (getState as jest.Mock).mockImplementation(() => {
        return {
          alertStates: [
            {
              cluster: {
                clusterUuid,
                clusterName,
              },
              ccs: null,
              gapDuration: 1,
              stackProduct,
              stackProductName,
              stackProductUuid,
              ui: {
                isFiring: true,
                message: null,
                severity: 'danger',
                resolvedMS: 0,
                triggeredMS: 1,
                lastCheckedMS: 0,
              },
            },
          ],
        };
      });
      const alert = new MissingMonitoringDataAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl,
        false
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 1;
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: { clusterUuid, clusterName },
            ccs: null,
            gapDuration: 1,
            stackProduct,
            stackProductName,
            stackProductUuid,
            ui: {
              isFiring: false,
              message: {
                text:
                  'We are now seeing monitoring data for the Elasticsearch node: esName1, as of #resolved',
                tokens: [
                  {
                    startToken: '#resolved',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 1,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `We are now seeing monitoring data for 1 stack product(s) in cluster testCluster.`,
        internalShortMessage: `We are now seeing monitoring data for 1 stack product(s) in cluster: testCluster.`,
        clusterName,
        count,
        stackProducts: 'Elasticsearch node: esName1',
        state: 'resolved',
      });
    });

    it('should handle ccs', async () => {
      const ccs = 'testCluster';
      (fetchMissingMonitoringData as jest.Mock).mockImplementation(() => {
        return [
          {
            ...missingData[0],
            ccs,
          },
        ];
      });
      const alert = new MissingMonitoringDataAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl,
        false
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 1;
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `We have not detected any monitoring data for 1 stack product(s) in cluster: testCluster. [View what monitoring data we do have for these stack products.](http://localhost:5601/app/monitoring#/overview?_g=(cluster_uuid:abc123,ccs:testCluster))`,
        internalShortMessage: `We have not detected any monitoring data for 1 stack product(s) in cluster: testCluster. Verify these stack products are up and running, then double check the monitoring settings.`,
        action: `[View what monitoring data we do have for these stack products.](http://localhost:5601/app/monitoring#/overview?_g=(cluster_uuid:abc123,ccs:testCluster))`,
        actionPlain:
          'Verify these stack products are up and running, then double check the monitoring settings.',
        clusterName,
        count,
        stackProducts: 'Elasticsearch node: esName1',
        state: 'firing',
      });
    });

    it('should fire with different messaging for cloud', async () => {
      const alert = new MissingMonitoringDataAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl,
        true
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 2;
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `We have not detected any monitoring data for 2 stack product(s) in cluster: testCluster. Verify these stack products are up and running, then double check the monitoring settings.`,
        internalShortMessage: `We have not detected any monitoring data for 2 stack product(s) in cluster: testCluster. Verify these stack products are up and running, then double check the monitoring settings.`,
        action: `[View what monitoring data we do have for these stack products.](http://localhost:5601/app/monitoring#/overview?_g=(cluster_uuid:abc123))`,
        actionPlain:
          'Verify these stack products are up and running, then double check the monitoring settings.',
        clusterName,
        count,
        stackProducts: 'Elasticsearch node: esName1, Kibana instance: kibanaInstance1',
        state: 'firing',
      });
    });
  });
});
