import * as React from 'react';
import { style } from 'typestyle';
import { INotification, toast } from 'jupyterlab_toastify';

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
        if(nameInput.value.length === 0){
          throw new Error('A environment name should be provided.')
        }
        let toastId = INotification.notify(
          'Creating environment ' + nameInput.value, { autoClose: false });
        let r = await this.props.model.create(nameInput.value, typeInput.value);
        console.debug(r);
        toast.update(toastId, {
          render: 'Environment ' + nameInput.value + ' has been created.',
          type: toast.TYPE.SUCCESS,
          autoClose: 5000
        } as any);
        this.setState({ currentEnvironment: nameInput.value });
        this.loadEnvironments();
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
        if(nameInput.value.length === 0){
          throw new Error('A environment name should be provided.')
        }
        let toastId = INotification.notify(
          'Cloning environment ' + this.state.currentEnvironment, { autoClose: false });
        let r = await this.props.model.clone(this.state.currentEnvironment, nameInput.value);
        console.debug(r);
        toast.update(toastId, {
          render: 'Environment ' + nameInput.value + ' created.',
          type: toast.TYPE.SUCCESS,
          autoClose: 5000
        } as any);
        this.setState({ currentEnvironment: nameInput.value });
        this.loadEnvironments();
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
        if(nameInput.value.length === 0){
          throw new Error('A environment name should be provided.')
        }
        if(fileInput.files.length === 0){
          throw new Error('A environment file should be selected.')
        }
        let toastId = INotification.notify(
          'Import environment ' + nameInput.value, { autoClose: false });
        var file = await this._readText(fileInput.files[0]);
        let r = await this.props.model.import(nameInput.value, file);
        console.debug(r);
        toast.update(toastId, {
          render: 'Environment ' + nameInput.value + ' created.',
          type: toast.TYPE.SUCCESS,
          autoClose: 5000
        } as any);
        this.setState({ currentEnvironment: nameInput.value });
        this.loadEnvironments();
      }
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  async handleExportEnvironment(){
    try{
      let response = await this.props.model.export(this.state.currentEnvironment);
      if(response.ok){
        let content = await response.text();
        let node = document.createElement('div');
        let link = document.createElement('a');
        link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        link.setAttribute('download', this.state.currentEnvironment + '.txt');
        
        node.style.display = 'none'; // hide the element
        node.appendChild(link);
        document.body.appendChild(node);
        link.click();
        document.body.removeChild(node);
      }
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
        let toastId = INotification.notify(
          'Removing environment ' + this.state.currentEnvironment, { autoClose: false });
        let r = await this.props.model.remove(this.state.currentEnvironment);
        console.log(r);
        toast.update(toastId, {
          render: 'Environment ' + this.state.currentEnvironment + ' has been removed.',
          type: toast.TYPE.SUCCESS,
          autoClose: 5000
        } as any);
        this.setState({ currentEnvironment: undefined });
        this.loadEnvironments();
      }
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  async loadEnvironments() {    
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

  componentDidMount(){
    this.loadEnvironments();
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