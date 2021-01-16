FROM jupyter/minimal-notebook

COPY . /tmp/gator

RUN ls /tmp/gator \
 && conda install -y -q yarn \
 && pushd /tmp/gator \
 && jlpm \
 && jlpm build \
 && python -m pip install .
 && popd
