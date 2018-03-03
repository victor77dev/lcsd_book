import axios from "axios";

export function getCourtInfo(date) {
  return function(dispatch) {
    console.log("action getCourtInfo: " + date);
    axios.get("http://victor77dev.ddns.net:4000/api/date/" + date)
      .then((response) => {
        console.log("courtInfoActions: " + JSON.stringify(response.data));
        dispatch({type: "GET_DATA", payload: {date: date, data: response.data} });
      })
  }
}
