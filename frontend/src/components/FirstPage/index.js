import React, { useState } from "react";

import { Grid, Button, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
  },
  button: {
    margin: 16,
  },
}));

function FirstPage(props) {
  const [value, setValue] = useState("");

  const classes = useStyles();

  const onClick = () => {
    props.socket.emit("enter", value);
  };

  return (
    <Grid
      container
      className={classes.root}
      justifyContent="center"
      alignItems="center"
      direction="column"
    >
      <TextField
        label="Nome"
        variant="filled"
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        className={classes.button}
        onClick={onClick}
        variant="contained"
        color="primary"
        disabled={!value}
      >
        Entrar
      </Button>
    </Grid>
  );
}

export default FirstPage;
