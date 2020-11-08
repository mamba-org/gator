const data = JSON.parse(
  document.getElementById('jupyter-config-data').innerHTML
);

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
__webpack_public_path__ = (data.baseUrl || '/') + 'static/gator/';
