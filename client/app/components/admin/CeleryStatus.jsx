import React from 'react';
import PropTypes from 'prop-types';
import { $http } from '@/services/ng';
import Table from 'antd/lib/table';
import Col from 'antd/lib/col';
import Row from 'antd/lib/row';
import Card from 'antd/lib/card';
import Spin from 'antd/lib/spin';
import Badge from 'antd/lib/badge';
import Tabs from 'antd/lib/tabs';
import moment from 'moment';
import values from 'lodash/values';
import { Columns } from '@/components/items-list/components/ItemsTable';

function parseTasks(tasks) {
  const queues = {};
  const queries = [];
  const otherTasks = [];

  const counters = { active: 0, reserved: 0, waiting: 0 };

  tasks.forEach((task) => {
    queues[task.queue] = queues[task.queue] || { name: task.queue, active: 0, reserved: 0, waiting: 0 };
    queues[task.queue][task.state] += 1;

    if (task.enqueue_time) {
      task.enqueue_time = moment(task.enqueue_time * 1000.0);
    }
    if (task.start_time) {
      task.start_time = moment(task.start_time * 1000.0);
    }

    counters[task.state] += 1;

    if (task.task_name === 'redash.tasks.execute_query') {
      queries.push(task);
    } else {
      otherTasks.push(task);
    }
  });

  return { queues: values(queues), queries, otherTasks, counters };
}

function QueuesTable({ loading, queues }) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
    },
    {
      title: 'Active',
      dataIndex: 'active',
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved',
    },
    {
      title: 'Waiting',
      dataIndex: 'waiting',
    },
  ];
  return <Table columns={columns} rowKey="name" dataSource={queues} loading={loading} />;
}

QueuesTable.propTypes = {
  loading: PropTypes.bool.isRequired,
  queues: PropTypes.arrayOf(PropTypes.any).isRequired,
};

function CounterCard({ title, value, loading }) {
  return (
    <Spin spinning={loading}>
      <Card>
        {title}
        <div className="f-20">{value}</div>
      </Card>
    </Spin>
  );
}

CounterCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool.isRequired,
};

CounterCard.defaultProps = {
  value: '',
};

export default class AdminCeleryStatus extends React.Component {
  state = {
    loading: true,
    counters: {},
    queries: [],
    otherTasks: [],
    queues: [],
  };

  constructor(props) {
    super(props);
    this.fetch();
  }

  fetch() {
    // TODO: handle error
    $http.get('/api/admin/queries/tasks').then(({ data }) => {
      const { queues, queries, otherTasks, counters } = parseTasks(data.tasks);
      this.setState({ loading: false, queries, otherTasks, queues, counters });
    });
  }

  render() {
    const commonColumns = [
      {
        title: 'Worker',
        children: [
          {
            title: 'Name',
            dataIndex: 'worker',
          },
          {
            title: 'PID',
            dataIndex: 'worker_pid',
          },
        ],
      },
      {
        title: 'Queue',
        dataIndex: 'queue',
      },
      {
        title: 'State',
        dataIndex: 'state',
        render: (value) => {
          if (value === 'active') {
            return (
              <span>
                <Badge status="processing" /> Active
              </span>
            );
          }
          return (
            <span>
              <Badge status="warning" /> {value}
            </span>
          );
        },
      },
      Columns.timeAgo({ title: 'Start Time', dataIndex: 'start_time' }),
    ];

    const queryColumns = commonColumns.concat([
      Columns.timeAgo({ title: 'Enqueue Time', dataIndex: 'enqueue_time' }),
      {
        title: 'Query',
        children: [
          {
            title: 'Query ID',
            dataIndex: 'query_id',
          },
          {
            title: 'Org ID',
            dataIndex: 'org_id',
          },
          {
            title: 'Data Source ID',
            dataIndex: 'data_source_id',
          },
          {
            title: 'User ID',
            dataIndex: 'user_id',
          },
          {
            title: 'Scheduled',
            dataIndex: 'scheduled',
          },
        ],
      },
    ]);

    const otherTasksColumns = commonColumns.concat([
      {
        title: 'Task Name',
        dataIndex: 'task_name',
      },
    ]);

    return (
      <div className="p-5">
        <Row gutter={16}>
          <Col span={3}>
            <CounterCard title="Active Tasks" value={this.state.counters.active} loading={this.state.loading} />
          </Col>
          <Col span={3}>
            <CounterCard title="Reserved Tasks" value={this.state.counters.reserved} loading={this.state.loading} />
          </Col>
          <Col span={3}>
            <CounterCard title="Waiting Tasks" value={this.state.counters.waiting} loading={this.state.loading} />
          </Col>
        </Row>
        <Row>
          <Tabs defaultActiveKey="queues">
            <Tabs.TabPane key="queues" tab="Queues">
              <QueuesTable loading={this.state.loading} queues={this.state.queues} />
            </Tabs.TabPane>
            <Tabs.TabPane key="queries" tab="Queries">
              <Table
                rowKey="task_id"
                dataSource={this.state.queries}
                loading={this.state.loading}
                columns={queryColumns}
              />
            </Tabs.TabPane>
            <Tabs.TabPane key="other" tab="Other Tasks">
              <Table
                rowKey="task_id"
                dataSource={this.state.otherTasks}
                loading={this.state.loading}
                columns={otherTasksColumns}
              />
            </Tabs.TabPane>
          </Tabs>
        </Row>
      </div>
    );
  }
}