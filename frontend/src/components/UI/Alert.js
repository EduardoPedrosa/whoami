import React from "react";

import { Snackbar, Portal } from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  snackbar: {
    zIndex: 9999,
  },
}));

function CustomAlert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function Alert(props) {
  const classes = useStyles();

  const handleCloseSnack = () => {
    props.setError("");
  };

  return (
    <Portal>
      <Snackbar
        className={classes.snackbar}
        open={props.error}
        autoHideDuration={6000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <CustomAlert onClose={handleCloseSnack} severity="error">
          {props.error}
        </CustomAlert>
      </Snackbar>
    </Portal>
  );
}

export default Alert;
