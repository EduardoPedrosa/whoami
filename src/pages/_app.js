import React from "react";

import App from "next/app";
import Head from "next/head";

import CssBaseline from "@material-ui/core/CssBaseline";
// import { ThemeProvider } from "@material-ui/core/styles";

// import theme from "@api/palette/theme";

export default class MyApp extends App {
  componentDidMount() {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  render() {
    const { Component, pageProps } = this.props;

    return (
      <React.Fragment>
        <Head>
          <title>Who Am I</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, minimum-scale=1,maximum-scale=1, user-scalable=0"
          />
        </Head>
        {/* <ThemeProvider theme={theme}> */}
        <CssBaseline />
        <Component {...pageProps} />
        {/* </ThemeProvider> */}
      </React.Fragment>
    );
  }
}
