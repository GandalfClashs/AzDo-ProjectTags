import "./ProjectView.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

import { showRootComponent } from "../Common";

import {
  CommonServiceIds,
  getClient,
  IHostNavigationService,
} from "azure-devops-extension-api";
import {
  CoreRestClient,
  TeamProjectReference,
} from "azure-devops-extension-api/Core";

import { Image } from "azure-devops-ui/Image";

import {
  ScrollableList,
  IListItemDetails,
  ListItem,
} from "azure-devops-ui/List";

import ProjectFilter, {
  PROJECT_FILTER_ORGTAGS,
  PROJECT_FILTER_PROJECTNAME,
  PROJECT_FILTER_USERTAGS,
} from "../Components/ProjectFilter";
import {
  IReadonlyObservableValue,
  ObservableArray,
} from "azure-devops-ui/Core/Observable";
import {
  IFilterItemState,
  IFilterState,
} from "azure-devops-ui/Utilities/Filter";
import { TagItem } from "../Components/ProjectTagPicker";

interface IPivotContentState {
  loading: boolean;
}

interface IProjectInformation {
  project: TeamProjectReference;
}

class ProjectViewPivot extends React.Component<{}, IPivotContentState> {
  private orgName: string = "";
  private navService?: IHostNavigationService;
  private filteredProjects = new ObservableArray<
    | IProjectInformation
    | IReadonlyObservableValue<IProjectInformation | undefined>
  >();
  private projectInfos: IProjectInformation[] = [];

  constructor(props: {}) {
    super(props);
    this.state = { loading: true };
  }

  public async componentDidMount() {
    await SDK.init({ loaded: false });
    this.orgName = SDK.getHost().name;
    this.initializeComponent();
  }

  private async initializeComponent() {
    const projects = await getClient(CoreRestClient).getProjects(
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    this.navService = await SDK.getService<IHostNavigationService>(
      CommonServiceIds.HostNavigationService,
    );
    this.projectInfos = [];
    for (let project of projects.sort((a, b) => a.name.localeCompare(b.name))) {
      this.projectInfos.push({
        project: project,
      });
    }
    this.filteredProjects.value = this.projectInfos;
    SDK.notifyLoadSucceeded();
    this.setState({ loading: false });
  }

  updateListFilter = (
    filterState: IFilterState,
    userTags: TagItem[],
    orgTags: TagItem[],
  ) => {
    const projectNameFilter = filterState[PROJECT_FILTER_PROJECTNAME];
    const userTagsFilter = filterState[PROJECT_FILTER_USERTAGS];
    const orgTagsFilter = filterState[PROJECT_FILTER_ORGTAGS];
    this.filteredProjects.value = this.projectInfos.filter(
      (item) =>
        this.filterByProjectName(
          (item as IProjectInformation).project.name,
          projectNameFilter,
        ) &&
        this.filterByTags(item.project.id, userTags, userTagsFilter) &&
        this.filterByTags(item.project.id, orgTags, orgTagsFilter),
    );
  };

  private filterByProjectName(
    name: string,
    filterState: IFilterItemState | null,
  ): boolean {
    return filterState == null
      ? true
      : name.toLowerCase().indexOf(filterState.value.toLowerCase()) > -1;
  }

  private filterByTags(
    projectId: string,
    tags: TagItem[],
    filterState: IFilterItemState | null,
  ): boolean {
    return filterState == null || (filterState.value as string[]).length === 0
      ? true
      : tags
          .filter((t) => t.assignedToProjects.includes(projectId))
          .filter((t) => (filterState.value as string[]).includes(t.text))
          .length > 0;
  }

  public render(): JSX.Element {
    return (
      <div className="project-pivot">
        {this.state.loading && <p>Loading...</p>}
        {!this.state.loading && (
          <div>
            <ProjectFilter onFilterChanged={this.updateListFilter} />
            <div className="project-tags depth-8">
              <ScrollableList
                itemProvider={this.filteredProjects}
                renderRow={this.renderRow}
                width="100%"
                showScroll={false}
              />
            </div>
            <div style={{ height: "16px" }}></div>
          </div>
        )}
      </div>
    );
  }

  private navigateToProject(projectName: string, newWindow: boolean) {
    if (newWindow) {
      this.navService!.openNewWindow(
        `https://dev.azure.com/${this.orgName}/${projectName}`,
        "_blank",
      );
    } else {
      this.navService!.navigate(
        `https://dev.azure.com/${this.orgName}/${projectName}`,
      );
    }
  }

  private renderRow = (
    index: number,
    item: IProjectInformation,
    details: IListItemDetails<IProjectInformation>,
    key?: string,
  ): JSX.Element => {
    return (
      <ListItem
        key={key || "list-item" + index}
        index={index}
        details={details}
      >
        <div
          className="flex flex-column flex-grow project-link"
          onClick={() => this.navigateToProject(item.project.name, false)}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              this.navigateToProject(item.project.name, true);
            }
          }}
        >
          <div className="top-row flex flex-noshrink">
            <Image
              alt={item.project.name}
              src={item.project.defaultTeamImageUrl}
              width={48}
              height={48}
              className="project-image"
            />
            <div
              style={{ marginLeft: "10px" }}
              className="flex-column flex flex-grow"
            >
              <div className="font-size-l font-weight-semibold text-ellipsis">
                {item.project.name}
              </div>
              <div className="font-size-m">{item.project.description}</div>
            </div>
          </div>
        </div>
      </ListItem>
    );
  };
}

showRootComponent(<ProjectViewPivot />);
