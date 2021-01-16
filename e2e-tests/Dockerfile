FROM jupyter/minimal-notebook

COPY . /tmp/gator

RUN conda list \
 && conda install -y yarn \
 && jlpm \
 && jlpm build \
 && python -m pip install /tmp/gator
