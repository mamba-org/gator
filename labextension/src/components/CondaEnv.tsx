import * as React from 'react';
import { style } from 'typestyle';

import { CondaEnvList } from './CondaEnvList';
import { CondaPkgPanel } from './CondaPkgPanel';
import { EnvironmentsModel } from '../models';
import { showErrorMessage, showDialog, Dialog } from '@jupyterlab/apputils';
import { Widget } from '@phosphor/widgets';

export interface ICondaEnvProps {
  height: number,
  width: number,
  model: EnvironmentsModel
}

export interface ICondaEnvState extends EnvironmentsModel.IEnvironments {
  currentEnvironment?: string,
  isLoading: boolean
}

/** Top level React component for widget */
export class CondaEnv extends React.Component<ICondaEnvProps, ICondaEnvState>{
  
  constructor(props){
    super(props);

    this.state = {
      environments: new Array(),
      currentEnvironment: undefined,
      isLoading: false
    };

    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
    this.handleCreateEnvironment = this.handleCreateEnvironment.bind(this);
    this.handleCloneEnvironment = this.handleCloneEnvironment.bind(this);
    this.handleImportEnvironment = this.handleImportEnvironment.bind(this);
    this.handleExportEnvironment = this.handleExportEnvironment.bind(this);
    this.handleRemoveEnvironment = this.handleRemoveEnvironment.bind(this);
  }

  handleEnvironmentChange(name: string){
    this.setState({
      currentEnvironment: name
    });
  }

  async handleCreateEnvironment(){
    try{
      let body = document.createElement('div');
      let nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name : ';
      let nameInput = document.createElement('input');
      body.appendChild(nameLabel);
      body.appendChild(nameInput);
      
      let typeLabel = document.createElement('label');
      typeLabel.textContent = 'Type : ';
      let typeInput = document.createElement('select');
      let opt = document.createElement('option');
      opt.setAttribute('value', 'python2');
      opt.innerText = 'Python 2';
      typeInput.appendChild(opt);
      opt = document.createElement('option');
      opt.setAttribute('value', 'python3');
      opt.selected = true;
      opt.innerText = 'Python 3';
      typeInput.appendChild(opt);
      opt = document.createElement('option');
      opt.setAttribute('value', 'r');
      opt.innerText = 'R';
      typeInput.appendChild(opt);
      body.appendChild(typeLabel);
      body.appendChild(typeInput);

      let response = await showDialog({
        title: 'New Environment',
        body: new Widget({node: body}),
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      });
      if (response.button.accept){
        this.props.model.create(nameInput.value, typeInput.value);
      }
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  async handleCloneEnvironment(){
    try{
      let body = document.createElement('div');
      let nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name : ';
      let nameInput = document.createElement('input');
      body.appendChild(nameLabel);
      body.appendChild(nameInput);

      let response = await showDialog({
        title: 'Clone Environment',
        body: new Widget({node: body}),
        buttons: [Dialog.cancelButton(), Dialog.okButton({caption: 'Clone'})]
      });
      if (response.button.accept){
        this.props.model.clone(this.state.currentEnvironment, nameInput.value);
      }
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  private _readText(file): Promise<any>{
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onload = function(event: any){
        resolve(event.target.result);
      };
      reader.readAsText(file);
    });
  }

  async handleImportEnvironment(){
    try{
      let body = document.createElement('div');
      let nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name : ';
      let nameInput = document.createElement('input');
      body.appendChild(nameLabel);
      body.appendChild(nameInput);
      
      let fileLabel = document.createElement('label');
      fileLabel.textContent = 'File : ';
      let fileInput = document.createElement('input');
      fileInput.setAttribute('type', 'file');

      body.appendChild(fileLabel);
      body.appendChild(fileInput);

      let response = await showDialog({
        title: 'Import Environment',
        body: new Widget({node: body}),
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      });
      if (response.button.accept){
        var file = await this._readText(fileInput.value);
        this.props.model.import(nameInput.value, file);
      }
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  async handleExportEnvironment(){
    try{
      this.props.model.export(this.state.currentEnvironment);
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  async handleRemoveEnvironment(){
    try{
      let response = await showDialog({
        title: 'Remove Environment',
        body: `Are you sure you want to permanently delete environment "${this.state.currentEnvironment}" ?`,
        buttons: [Dialog.cancelButton(), 
                  Dialog.okButton({
                    caption: 'Delete', 
                    displayType: 'warn'})]
      });
      if (response.button.accept){
        this.props.model.remove(this.state.currentEnvironment);
      }
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  async componentDidMount(){
    if (!this.state.isLoading){
      this.setState({isLoading: true});
      try{
        let newState: Partial<ICondaEnvState> = await this.props.model.load();
        if (this.state.currentEnvironment === undefined) {
          newState.environments.forEach(env => {
            if (env.is_default){
              newState.currentEnvironment = env.name;
            }
          });
        }
        newState.isLoading = false;
        this.setState(newState as ICondaEnvState);
      } catch (error) {
        showErrorMessage('Error', error);
      }
    }
  }

  render() {
    return (
      <div className={Style.Panel}>
        <CondaEnvList 
          height={this.props.height}
          environments={this.state.environments}
          selected={this.state.currentEnvironment}
          onSelectedChange={this.handleEnvironmentChange}
          onCreate={this.handleCreateEnvironment}
          onClone={this.handleCloneEnvironment}
          onImport={this.handleImportEnvironment}
          onExport={this.handleExportEnvironment}
          onRemove={this.handleRemoveEnvironment} />
        <CondaPkgPanel
          height={this.props.height} 
          environment={this.state.currentEnvironment} />
      </div>      
    );
  }
}

namespace Style {
  export const Panel =  style({
    width: '100%',
    display: 'flex', 
    flexDirection: 'row',
    borderCollapse: 'collapse'
  });
}