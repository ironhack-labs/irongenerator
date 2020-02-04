# Contributing guidelines

The entire development efforts of the project should be concentrated in the [official Github repository for `irongenerator`](https://github.com/ironhack-labs/irongenerator/).

Note we have the [Code of Conduct](https://github.com/ironhack-labs/irongenerator/blob/master/CODE-OF-CONDUCT.md). Please follow it in all your interactions with the project.

We should follow the common _procedure/workflow as described below_:

```shell
(1) Open an issue
      │
      v
(2) Discuss
      │
      v
(3) Commit solution to a single-purpose branch
      │
      v
(4) Create PR to master, add at least one reviewer
      │
      v
(5) Review process
      │
      v
(6) Approve and merge to master
      │
      v
(7) Publish to npm
```

## Implementation

**1.** [MUST] Open an issue or suggestion for improvement through the issues on this repository. Consider an issue anything you want to see added or modified.

- _Add labels that could help everyone to know what is this issue about._
- _Pick from the existing list of labels: discussion, bug, documentation, enhancement, etc._

**2.** [SHOULD] Be part of the discussion by helping out with existing issues.

**3.** [MUST] Create a one single (feature) branch on your local fork, straight to [ironhack-labs/irongenerator](https://github.com/ironhack-labs/irongenerator). All PRs should be submitted from a separate branch.

Create a new branch following our **branch naming convention**:

- Branch name must match ticket/issue title (ex. `issue-3`, `issue-127`).
  - In case some issues are "dependencies" of other issues so multiple issues can be solved at once, name your branch by the "parent" branch (in the body of that issue, we will see another child/children issues and close them accordingly).
  - In case there is no open issue since we don't require opening an issue for fixing a typo, name your branch with `hotfix-descriptive-name`.
- The branch name needs to follow the kebab-case rule.
- Make all the changes related to a specific issue on one branch so we can close the issue and the PR after merging it.

Before submitting a pull request, please **make sure your local feature branch is up to date with `ironhack-labs/tree/master`**:

```shell
$ git remote add upstream https://github.com/ironhack-labs/irongenerator.git
$ git fetch --all
$ git checkout -b my-feature-branch upstream/master
```

**4.** [MUST] Make a PR that solves an issue or suggestion for improvement.

- _The PR title must start with `Resolves #[issue-id]` indicating the issue ID._ <!-- Once the PR is merged, the issue will be automatically closed. [Read more about this topic](https://help.github.com/en/github/managing-your-work-on-github/closing-issues-using-keywords) -->
  - In case you are closing multiple issues with one PR, you should add references to all of them in the title of the PR. (ex. _"Resolves #3, resolves #5, resolves #8"_)
- _Add a descriptive message to add relevant information to the PR, such as:_
  - _"Create function `updateList(id)` to update list of tasks."_
  - _"Update existing method for deleting tasks. Needs review: I am not sure how to handle dependent tasks."_
- _Add at least one reviewer for every PR._
  - In case you can't add `Reviewer` in the Reviewer section, add them in the body of the PR with `@reviewerGitHubUsername` (ex. _@sandrabosk_ and Sandra will get an email that someone mentioned her in a PR.)
  - Feel free to add two reviewers if you find it suitable. More than that is not needed.
- _Increase the version numbers in any examples files (and correlated README.md if there is any) to the new version that this PR would represent. The versioning scheme we use is [SemVer](https://semver.org/)._
- _One PR shouldn't have changes in more than 3-4 files. In case we end up creating a PR that results in changes in more than 4 files, and the PR is based on a single issue - request review of that issue. It should probably be split in more issues._

**Exception:** _A PR doesn't have to have a correlated issue if you are fixing a typo or adding some comments to help students grasp the concept better. However, don't push directly to `master` not even in this case - have a separate branch, make a PR, add reviewer,... follow the process nevertheless._

**5.** [SHOULD] Write tests and make PR as well.

**6.** [SHOULD] Merge the PR once you have the sign-off of at least one other developer, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

**Please make sure you at all times take into account [our styleguide](https://github.com/ironhack-labs/irongenerator/blob/master/STYLEGUIDE.md), so we can keep our code consistent.**

## Acceptance

Two different acceptance criteria need to be satisfied to mark a single PR as successful and to resolve in closing that PR and the corresponding issue:

- **Technical**: the PR needs to meet the best coding practices and follow given style guides.
- **Product**: the PR closes an issue and solves the specified problem. Make sure each issue is targeting a specific problem and has a detailed and accurate description of it, as well as a suggestion for the solution. If these are satisfied, and PR results in solving this issue, we know that it is acceptable PR and can be merged to master.

Thank you for contributing! :heart:
