import { ITaskStatusFixture } from '@beam-app/mocks/seedUtils/fixtureUtils.types';
import { faker } from '@faker-js/faker';
import { isSameDay } from 'date-fns';

import { ITaskApiRawQuery, TaskPriorities } from '@models/Task.model';
import { IPaginationResult } from '@models/types';
import { IUserInvitedApiModel } from '@models/UserInvited.model';

import * as testIds from '@utils/testIds';
import { trimTime } from '@utils/time/trimTime';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';
import { setUser } from '../../support/utils/misc';

const { _ } = Cypress;
interface ICtx {
  user: IUserInvitedApiModel;
  statusId: string;
  taskId: string;
}
function interceptStudioTasks() {
  cy.intercept(
    pathToRouteMatcher('/studios/:studioId/tasks', {
      method: 'GET',
    }),
  ).as('studioTasks');
}
describe('Create Tasks', () => {
  const ctx = {} as ICtx;
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    interceptSettingsAndProfile();

    cy.intercept(pathToRouteMatcher('/tasks', { method: 'POST' })).as(
      'createTask',
    );
    cy.intercept(
      pathToRouteMatcher('/tasks/:id', {
        method: 'PATCH',
      }),
    ).as('patchTask');
    cy.intercept(
      pathToRouteMatcher('/tasks/:id/raw', {
        method: 'GET',
      }),
    ).as('getTask');
    cy.intercept(
      pathToRouteMatcher('/products/tasks', {
        method: 'GET',
      }),
    ).as('getProductsForTask');
    cy.task('db:seed:filled');

    setUser(ctx);
    cy.fixture('generated/taskStatuses').then(
      (taskStatuses: ITaskStatusFixture) => {
        const nonDefaultStatus = _.find(taskStatuses.data, {
          isDefault: false,
        });
        expect(nonDefaultStatus).to.be.a('object');
        ctx.statusId = `${nonDefaultStatus?.id}`;
      },
    );

    cy.visit('/tasks', { failOnStatusCode: false });
    waitForSettingsAndProfile();
    cy.findByTestId(testIds.tasks.addTaskButton).click();
    cy.wait('@createTask')
      .its('response')
      .then($res => {
        expect($res?.statusCode).to.equal(200);
        expect($res?.body).not.to.be.undefined;
        const body = $res?.body as ITaskApiRawQuery;
        ctx.taskId = body.id;
      });

    cy.location('search').should('contain', 'taskId');
    cy.wait('@getTask');
  });

  function ensureTaskInResponse() {
    cy.wait('@studioTasks')
      .its('response')
      .then($res => {
        expect($res?.statusCode).to.equal(200);
        const $body = $res?.body as IPaginationResult<ITaskApiRawQuery>;
        expect($body).to.be.an('object');
        const { results = [] } = $body;
        const $values = results.map(each => each.id);
        expect($values).to.contain(ctx.taskId);
      });
  }
  it('Creates a task with required fields', () => {
    const task = {
      title: 'Example task title',
    };
    cy.findByTestId(testIds.tasks.detailsDialog).should('be.visible');
    cy.findByTestId(testIds.detailsDialog.title).type(task.title);
    cy.findByTestId(testIds.detailsDialog.submit)
      .contains(/create task/i)
      .click();
    interceptStudioTasks();
    cy.wait('@patchTask')
      .its('response')
      .then($res => {
        const { statusCode, body } = $res || {};
        expect(statusCode).to.equal(200);
        expect(body).to.contain({
          title: task.title,
        });
      });
    ensureTaskInResponse();

    cy.contains(
      `[data-testid=${testIds.detailsDialog.submit}]`,
      /save/i,
    ).should('be.disabled');
  });

  it('Creates a task with all fields, attachments and relationships', () => {
    const task = {
      title: 'Example task title',
      description: faker.lorem.paragraph(),
      attachments: [
        'cypress/fixtures/common/lorem-test.pdf',
        'cypress/fixtures/common/lorem-test.pdf',
      ],
      relationships: 1,
      priority: TaskPriorities.IMPORTANT,
      userId: ctx.user.id,
      statusId: ctx.statusId,
      dueDate: trimTime(faker.date.future()),
    };

    cy.intercept(
      pathToRouteMatcher('/tasks/:taskId/assets', { method: 'POST' }),
    ).as('relateAssets');
    cy.intercept(
      pathToRouteMatcher('/tasks/:taskId/files', { method: 'POST' }),
    ).as('uploadFile');

    cy.findByTestId(testIds.detailsDialog.title).type(task.title);
    cy.findByTestId(testIds.detailsDialog.description).type(task.description);
    cy.findByTestId(testIds.tasks.detailsDialog).within(() => {
      // Select priority
      function selectTaskLikePriority(priority: TaskPriorities) {
        cy.findByTestId(testIds.taskLike.priorityFlag).click();
        cy.findByTestId(testIds.taskLike.priorityItem(priority)).click();
      }
      selectTaskLikePriority(task.priority);
      // Select assignee
      function selectAssignee(userId: string) {
        cy.findByTestId(testIds.misc.assigneeButton).click();
        cy.findByTestId(testIds.assigneeItem(userId)).click();
      }
      selectAssignee(task.userId);
      // Select status
      function selectStatus(statusId: string) {
        cy.findByTestId(testIds.taskLike.statusButton).click();
        cy.findByTestId(testIds.taskLike.statusItem(statusId)).click();
      }
      selectStatus(task.statusId);
      // Select a date.
      function selectDate(date: Date) {
        // Set the day to the date we want to set.
        cy.clock(date);
        // Select
        cy.findByTestId(testIds.misc.datePickerBtn).click();
        cy.findByTestId(testIds.misc.datePickerContainer).within(() => {
          // FIXME: Update to mantine v6 to spread dayCell to date
          cy.get('.mantine-Calendar-day:not([data-outside])')
            .contains(date.getDate())
            .click();
        });
        cy.clock().then($clock => {
          // Necessary for queries to function correctly
          $clock.restore();
        });
      }
      selectDate(task.dueDate);
    });
    // Select assets
    function selectFirstAssetOfN(total: number) {
      cy.findByTestId(testIds.detailsDialog.addRelationshipsBtn).click();
      cy.wait('@getProductsForTask');
      _.times(total, index => {
        cy.findAllByTestId(testIds.addAssetsRelationshipDialog.productRow)
          .eq(index)
          .as('productRow')
          .click();

        cy.findAllByTestId(testIds.addAssetsRelationshipDialog.assetRow)
          .eq(index)
          .click();
      });
      cy.findByTestId(testIds.addAssetsRelationshipDialog.addBtn).click();
    }
    selectFirstAssetOfN(task.relationships);
    // Select files
    function selectFiles(files: string[]) {
      cy.findByTestId(testIds.detailsDialog.addAttachmentsBtn).click();
      cy.findByTestId(testIds.addFile.fileInput).selectFile(files, {
        force: true,
      });
    }
    selectFiles(task.attachments);

    // Send
    cy.findByTestId(testIds.detailsDialog.submit)
      .contains(/create task/i)
      .click();
    interceptStudioTasks();
    cy.wait('@relateAssets');

    _.times(task.attachments.length, () => {
      cy.wait('@uploadFile');
    });
    cy.wait('@patchTask')
      .its('response')
      .then($res => {
        const { statusCode } = $res || {};
        expect(statusCode).to.equal(200);

        const $body = $res?.body as ITaskApiRawQuery | undefined;
        const { dueDate } = $body || {};
        expect($body).to.contain({
          title: task.title,
          description: task.description,
          priority: task.priority,
          userId: task.userId,
          statusId: task.statusId,
        });

        expect(dueDate).to.be.a('string').that.is.not.empty;
        assert(
          isSameDay(new Date(dueDate as string), task.dueDate),
          `${dueDate} is not on the same day as ${task.dueDate.toJSON()}`,
        );
        expect($body?.assets).to.have.length(task.relationships);
        expect($body?.files).to.have.length(task.attachments.length);
      });

    // Assert that the task is visible on the page.
    ensureTaskInResponse();

    cy.contains(
      `[data-testid=${testIds.detailsDialog.submit}]`,
      /save/i,
    ).should('be.disabled');
  });
});
