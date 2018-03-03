export default function reducer(state={
  data: {},
  error: "",
}, action) {
  switch (action.type) {
    case "GET_DATA": {
      const { date, data } = action.payload;
      console.log("REDUCER GET_DATA " + date + ":" + data);
      return { ...state,
        data: data
      }
    }
    default:
     return state;
  }
  //return state;
}
