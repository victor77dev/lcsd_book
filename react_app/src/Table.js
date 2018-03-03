import React, { Component } from 'react';

class DataRow extends Component {
  render() {
    const { court, row } = this.props;
    var list = row.map(data => <td>{data}</td>);
    return (
      <tr>
        <td>{court}</td>
        {list}
      </tr>
    );
  }
}

class Table extends Component {
  render() {
    const { date, time, rowData } = this.props;

    var list = Object.keys(rowData).map(key => <DataRow court={key} row={rowData[key]} />);
    var timeRowData = time.map(data => <th>{data}</th>);
    return (
      <div>
        <p>Date: {date}</p>
        <table>
          <thead>
            <tr> <th></th> {timeRowData} </tr>
          </thead>
          <tbody>
            {list}
          </tbody>
        </table>
      </div>
    );
  }
}

export default Table;
