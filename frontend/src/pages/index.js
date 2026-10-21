import { useState, useEffect } from "react";
import { io } from "socket.io-client";

import { Grid, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import FirstPage from "../components/FirstPage";
import Playing from "../components/Playing";
import Alert from "../components/UI/Alert";

import states from "../utils/states";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eee",
    minHeight: "100vh",
  },
}));

export default function Home() {
  const [currentState, setCurrentState] = useState(states.FIRST_PAGE);
  const [socket, setSocket] = useState(null);
  const [me, setMe] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const classes = useStyles();

  useEffect(() => {
    const s = io("https://my-whoami-api.herokuapp.com/");
    setSocket(s);

    s.on("me", (data) => {
      setMe(data);
    });

    s.on("users", (data) => {
      if (currentState === states.FIRST_PAGE) {
        setCurrentState(states.WAITING);
      }
      setUsers(data);
    });

    s.on("started", (data) => {
      setCurrentState(states.PLAYING);
    });

    s.on("restarted", (data) => {
      setCurrentState(states.WAITING);
    });

    s.on("error", (data) => {
      setError(data);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <Grid className={classes.root}>
      {currentState === states.FIRST_PAGE ? (
        <FirstPage socket={socket} />
      ) : (
        <Playing
          socket={socket}
          currentState={currentState}
          users={users}
          me={me}
        />
      )}
      <Alert error={error} setError={setError} />
    </Grid>
  );
}
