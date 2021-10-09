import React, { useState } from "react";

import { Grid, Typography, Button, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import states from "../../utils/states";
import ShowUsers from "./ShowUsers";

const useStyles = makeStyles((theme) => ({
  root: {},
  title: {
    margin: 24,
  },
  button: {
    marginLeft: 16,
  },
  input: {
    width: 300,
  },
  submitButton: {
    margin: 24,
  },
}));

function Playing(props) {
  const [nextUserLabel, setNextUserLabel] = useState("");

  const classes = useStyles();

  const myUserIndex = props.users.findIndex((u) => u.id === props.me);
  const nextUserIndex =
    myUserIndex === props.users.length - 1 ? 0 : myUserIndex + 1;

  const onClick = () => {
    props.socket.emit("setLabel", nextUserLabel);
  };

  const onStart = () => {
    props.socket.emit("start");
  };

  const onRestart = () => {
    props.socket.emit("restart");
  };

  return (
    <Grid
      container
      className={classes.root}
      justifyContent="center"
      alignItems="center"
      direction="column"
    >
      <Typography variant="h2" className={classes.title}>
        Jogadores
      </Typography>

      <ShowUsers users={props.users} />

      {props.currentState === states.WAITING && props.users.length > 1 ? (
        <Grid>
          <Grid container justifyContent="center">
            <TextField
              className={classes.input}
              label={`Escolher quem ${props.users[nextUserIndex].name} vai ser`}
              variant="filled"
              onChange={(e) => setNextUserLabel(e.target.value)}
            />
            <Button
              className={classes.button}
              onClick={onClick}
              variant="contained"
              color="primary"
              disabled={!nextUserLabel}
            >
              Enviar
            </Button>
          </Grid>
          <Grid container justifyContent="center">
            <Button
              className={classes.submitButton}
              onClick={onStart}
              variant="contained"
              color="secondary"
            >
              Começar
            </Button>
          </Grid>
        </Grid>
      ) : (
        <Grid container justifyContent="center">
          <Button
            className={classes.submitButton}
            onClick={onRestart}
            variant="contained"
            color="secondary"
          >
            Recomeçar
          </Button>
        </Grid>
      )}
    </Grid>
  );
}

export default Playing;
