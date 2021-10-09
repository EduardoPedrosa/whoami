import React, { useEffect, useState } from "react";
import Xarrow, { useXarrow, Xwrapper } from "react-xarrows";

import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    position: "relative",
    marginTop: 130,
    height: 220,
  },
  item: {
    position: "absolute",
    transition: "all 0.3s",
    backgroundColor: "#ccc",
    borderRadius: 20,
    height: 50,
    width: 150,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  itemText: {
    padding: 4,
    fontSize: 12,
    color: "#666",
  },
  itemLabel: {
    padding: 4,
    color: theme.palette.primary.main,
  },
  hidden: {
    color: theme.palette.secondary.main,
  },
}));

const degToRad = (degrees) => {
  var pi = Math.PI;
  return degrees * (pi / 180);
};

function ShowUsers(props) {
  const [itemDeg, setItemDeg] = useState(360 / props.users.length);
  const updateXarrow = useXarrow();

  useEffect(() => {
    setItemDeg(360 / props.users.length);
    setTimeout(() => {
      updateXarrow();
    }, 300);
  }, [props.users]);

  const classes = useStyles();

  const rad = 130;

  const getDegByIndex = (index, offset) => {
    return degToRad(index * itemDeg - 90);
  };

  const getX = (index) => {
    return Math.cos(getDegByIndex(index)) * rad;
  };

  const getY = (index) => {
    return Math.sin(getDegByIndex(index)) * rad;
  };

  return (
    <Grid container justifyContent="center" className={classes.root}>
      {props.users.map((u, index) => (
        <Grid
          key={`item-${index}`}
          id={`item-${index}`}
          className={classes.item}
          style={{ transform: `translate(${getX(index)}px, ${getY(index)}px)` }}
        >
          <Typography className={classes.itemText}>{u.name} ➝ </Typography>
          <Typography className={classes.itemLabel}>
            {u.label === "hidden" ? (
              <span className={classes.hidden}>Oculto</span>
            ) : (
              u.label
            )}
          </Typography>
        </Grid>
      ))}
      <Xwrapper>
        {props.users.map((u, index, array) => {
          const nextIndex = index === array.length - 1 ? 0 : index + 1;
          if (index === nextIndex) return null;
          return (
            <Xarrow
              key={`arrow-${index}`}
              start={`item-${index}`}
              end={`item-${nextIndex}`}
              path="straight"
              startAnchor={[
                { position: "bottom", offset: { y: 8 } },
                { position: "top", offset: { y: -8 } },
              ]}
              endAnchor={[
                { position: "bottom", offset: { y: 8 } },
                { position: "top", offset: { y: -8 } },
              ]}
              zIndex={0}
              strokeWidth={3}
            />
          );
        })}
      </Xwrapper>
    </Grid>
  );
}

export default ShowUsers;
