FROM jupyter/minimal-notebook

COPY . /tmp/gator

RUN ls /tmp/gator \
 && npm config set unsafe-perm true \
 && conda install -y -q yarn \
 && pushd /tmp/gator \
 && jlpm \
 && jlpm build \
 && python -m pip install . \
 && popd
