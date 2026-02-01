import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

import "./ProjectSettingsHub.scss";

import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";

import { showRootComponent } from "../Common";
import { ProjectTagPicker } from "../Components/ProjectTagPicker";

interface IProjectAdminHubGroup {
  projectContext: any;
}

class ProjectAdminHubGroup extends React.Component<{}, IProjectAdminHubGroup> {
  constructor(props: {}) {
    super(props);
  }

  public async componentDidMount() {
    await SDK.init();
  }

  public render(): JSX.Element {
    return (
      <Page className="sample-hub flex-grow">
        <Header titleSize={TitleSize.Large} title="Project Tags Assignments" />
        <div className="page-content">
          <div className="webcontext-section">
            <h3>Assignments visible for all users:</h3>
            <ProjectTagPicker organizationTags={true} />
          </div>
          <div className="webcontext-section">
            <h3>Assignments visible only for you:</h3>
            <ProjectTagPicker organizationTags={false} />
          </div>
        </div>
      </Page>
    );
  }
}

showRootComponent(<ProjectAdminHubGroup />);
