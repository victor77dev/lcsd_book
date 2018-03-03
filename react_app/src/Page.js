import React, { Component } from 'react';
import { connect } from "react-redux";
import Table from "./Table"

import { getCourtInfo } from "./actions/courtInfoActions";

class Page extends Component {
  render() {
    const { courtInfo, actions } = this.props;
    var date = Object.keys(courtInfo.data);

    var button = <p onClick={ actions }>click here to show table</p>;

    if (date == "")
      return (
        <div>
          {button}
        </div>
      );
    else
    {
      var time = courtInfo.data[date]["time"];
      var rowData = courtInfo.data[date];
      delete courtInfo.data[date]["time"];
      return (
        <div>
          {button}
          <Table date={date} time={time} rowData={rowData}/>
        </div>
      );
    }
  }
}

function mapStateToProps(state) {
  console.log("testing::::" + JSON.stringify(state));
  return {
    courtInfo: state.courtInfo
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: () => {
      dispatch(getCourtInfo("20180201"))
    }
  }
}

//export default Table;
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Page);
