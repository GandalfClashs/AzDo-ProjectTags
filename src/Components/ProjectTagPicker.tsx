import {
  CommonServiceIds,
  IExtensionDataManager,
  IExtensionDataService,
  IProjectPageService,
} from "azure-devops-extension-api";
import {
  ObservableArray,
  ObservableValue,
} from "azure-devops-ui/Core/Observable";
import { ISuggestionItemProps } from "azure-devops-ui/SuggestionsList";
import { TagPicker } from "azure-devops-ui/TagPicker";
import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

export interface TagItem {
  assignedToProjects: string[];
  text: string;
}

export interface UsedProjectTags {
  id: string;
  tags: TagItem[];
}

export const emptyUsedTags: UsedProjectTags = { id: "Tags", tags: [] };

export class ProjectTagPicker extends React.Component<{
  organizationTags: boolean;
}> {
  private _dataManager?: IExtensionDataManager;
  private tagItems: ObservableArray<TagItem> = new ObservableArray();
  private suggestions: ObservableArray<TagItem> = new ObservableArray();
  private tagsStorage!: UsedProjectTags;
  private loadingTags: ObservableValue<boolean> = new ObservableValue<boolean>(
    true,
  );
  private projectId?: string;
  private manageOrganizationTags: boolean;

  constructor(props: { organizationTags: boolean }) {
    super(props);
    this.state = {};
    this.manageOrganizationTags = props.organizationTags;
  }

  public async componentDidMount() {
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    await SDK.ready();
    const accessToken = await SDK.getAccessToken();
    const extDataService = await SDK.getService<IExtensionDataService>(
      CommonServiceIds.ExtensionDataService,
    );
    this._dataManager = await extDataService.getExtensionDataManager(
      SDK.getExtensionContext().id,
      accessToken,
    );

    try {
      this.tagsStorage = await this._dataManager.getDocument(
        "ProjectTags",
        "Tags",
        {
          scopeType: this.manageOrganizationTags ? "Default" : "User",
        },
      );
    } catch (error) {
      this.tagsStorage = emptyUsedTags;
    }

    const client = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService,
    );
    const context = await client.getProject();
    this.projectId = context?.id;

    this.tagItems.value = this.tagsStorage.tags.filter((t) =>
      t.assignedToProjects.includes(this.projectId!),
    );

    this.suggestions.value = this.tagsStorage.tags.filter(
      (t) => !t.assignedToProjects.includes(this.projectId!),
    );

    this.loadingTags.value = false;
  }

  private async saveAssignedTags() {
    this.tagsStorage = await this._dataManager!.setDocument(
      "ProjectTags",
      this.tagsStorage,
      {
        scopeType: this.manageOrganizationTags ? "Default" : "User",
      },
    );
  }

  private areTagsEqual = (a: TagItem, b: TagItem) => {
    return a.text.localeCompare(b.text, "en", { sensitivity: "base" }) === 0;
  };

  private convertItemToPill = (tag: TagItem) => {
    return {
      content: tag.text,
      onClick: () => {},
    };
  };

  private onSearchChanged = (searchValue: string) => {
    this.suggestions.value = this.tagsStorage.tags
      .filter(
        // Items not already included
        (testItem) =>
          this.tagItems.value.findIndex((testSuggestion) =>
            this.areTagsEqual(testItem, testSuggestion),
          ) === -1,
      )
      .filter(
        (testItem) =>
          testItem.text.toLowerCase().indexOf(searchValue.toLowerCase()) > -1,
      );
  };

  private onTagAdded = (tag: TagItem) => {
    if (!this.tagItems.value.find((t) => this.areTagsEqual(t, tag)))
      this.tagItems.push(tag);

    const matchingTag = this.tagsStorage.tags.find((x) =>
      this.areTagsEqual(x, tag),
    );
    if (matchingTag) {
      if (!matchingTag.assignedToProjects.includes(this.projectId!)) {
        matchingTag.assignedToProjects.push(this.projectId!);
      }
    } else {
      tag.assignedToProjects = [this.projectId!];
      this.tagsStorage.tags.push(tag);
    }
    this.saveAssignedTags();
  };

  private onTagRemoved = (tag: TagItem) => {
    this.tagItems.removeAll((x) => this.areTagsEqual(x, tag));
    this.suggestions.removeAll((x) => this.areTagsEqual(x, tag));
    const matchingTag = this.tagsStorage.tags.find((x) =>
      this.areTagsEqual(x, tag),
    );
    if (matchingTag) {
      matchingTag.assignedToProjects = matchingTag.assignedToProjects.filter(
        (p) => p !== this.projectId,
      );
      if (matchingTag.assignedToProjects.length == 0) {
        this.tagsStorage.tags = this.tagsStorage.tags.filter(
          (t) => !this.areTagsEqual(t, matchingTag),
        );
      }
      this.saveAssignedTags();
    }
  };

  private createDefaultItem(name: string): TagItem {
    return { text: name, assignedToProjects: [this.projectId!] };
  }

  private renderSuggestionItem = (tag: ISuggestionItemProps<TagItem>) => {
    return <div className="body-m">{tag.item.text}</div>;
  };

  public render(): JSX.Element {
    return (
      <div className="flex-column">
        <TagPicker
          areTagsEqual={this.areTagsEqual}
          convertItemToPill={this.convertItemToPill}
          noResultsFoundText={"No results found"}
          onSearchChanged={this.onSearchChanged}
          onTagAdded={this.onTagAdded}
          onTagRemoved={this.onTagRemoved}
          renderSuggestionItem={this.renderSuggestionItem}
          selectedTags={this.tagItems}
          suggestions={this.suggestions}
          suggestionsLoading={this.loadingTags}
          ariaLabel={"Search for additional tags"}
          createDefaultItem={this.createDefaultItem}
          onSearchChangedDebounceWait={500}
        />
      </div>
    );
  }
}
