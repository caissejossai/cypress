import { faker } from '@faker-js/faker';

import { TaskPriorities } from '@models/Task.model';
import { ITicketApiModel } from '@models/Ticket.model';

import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

interface IRequiredFields {
  email: string;
  title: string;
  description: string;
  priority: TaskPriorities;
  id: number;
}
function makeTicket(priorty: TaskPriorities): IRequiredFields {
  return {
    email: `${Cypress.env('userEmail')}`,
    title: 'Test ticket',
    description: faker.lorem.paragraph(),
    id: 1,
    priority: priorty,
  };
}
function fillRequiredFields(fields: IRequiredFields) {
  cy.findByTestId('email-input').type(fields.email);
  cy.findByTestId('description-input').type(fields.description);
  cy.findByTestId('title-input').type(fields.title);
  cy.findByText(/select a priority/i).click();
  cy.findByTestId(testIds.customPicker.option(fields.priority)).click();
}
const tickets = Object.values(TaskPriorities).map(makeTicket);
const fileList = [
  ['cypress/fixtures/common/lorem-test.pdf'],
  [
    'cypress/fixtures/common/lorem-test.pdf',
    'cypress/fixtures/common/lorem-test.pdf',
  ],
];
describe('Create Ticket', () => {
  beforeEach(() => {
    cy.intercept(pathToRouteMatcher('/tickets', { method: 'POST' })).as(
      'postTickets',
    );
  });
  it('opens the Create Ticket Form from the app', function t() {
    interceptSettingsAndProfile();
    cy.loginWithApi();
    waitForSettingsAndProfile();

    cy.findByTestId('sidebar-item-/tickets').click();
    cy.findByTestId(testIds.tickets.tableMenu).click();
    const stub = cy.stub().as('open');
    cy.window().then($win => {
      cy.stub($win, 'open').callsFake(stub);
    });

    cy.findByRole('menuitem', {
      name: /open external form/i,
    }).click();
    cy.get('@open').should(
      'have.been.calledWith',
      `/create-ticket/${Cypress.env('studioId')}`,
      '_blank',
    );
  });

  context('opens the ticket link and submits a ticket', function t() {
    beforeEach(() => {
      cy.visit(`/create-ticket/${Cypress.env('studioId')}`, {
        failOnStatusCode: false,
      });

      cy.intercept(
        pathToRouteMatcher('/tickets/:id/files-logout', {
          method: 'POST',
        }),
      ).as('upload-file');
    });

    tickets.forEach(ticket => {
      it(`submits a ${ticket.priority} ticket`, () => {
        cy.intercept(pathToRouteMatcher('/tickets', { method: 'POST' })).as(
          'postTickets',
        );

        cy.findByTestId('create-ticket-title').contains(/report an issue/i);
        fillRequiredFields(ticket);
        cy.findByRole('button', {
          name: /submit/i,
        }).click();

        cy.wait('@postTickets')
          .its('response')
          .then(res => {
            expect(res?.statusCode).to.equal(200);
            const _ticket = res?.body as ITicketApiModel | undefined;
            expect(_ticket?.id).to.be.a('number');
            cy.findByTestId('email-preview').contains(ticket.email);
            cy.findByTestId('id-preview').contains(`${_ticket?.id}`);
            cy.findByTestId('title-preview').contains(ticket.title);
            cy.findByTestId(`priority-preview-${ticket.priority}`).should(
              'be.visible',
            );
            cy.findByTestId('description-preview').contains(ticket.description);
          });

        cy.findByRole('button', {
          name: /create another ticket/i,
        }).click();

        cy.findByTestId('email-input').invoke('val').should('be.empty');
        cy.findByTestId('description-input').invoke('val').should('be.empty');
        cy.findByTestId('title-input').invoke('val').should('be.empty');
        cy.findByText(/select a priority/i).should('exist');
      });
    });

    fileList.forEach(files => {
      const ticket = tickets[0];
      it(`submits a ${ticket.priority} ticket with ${files.length} attachments`, () => {
        cy.intercept(pathToRouteMatcher('/tickets', { method: 'POST' })).as(
          'postTickets',
        );

        fillRequiredFields(ticket);
        cy.findByTestId('attachment-input-trigger')
          .should('be.visible')
          .selectFile(files);
        cy.contains(`${files.length} Files Selected`).should('be.visible');

        cy.findByRole('button', { name: /submit/i }).click();
        cy.wait('@postTickets')
          .its('response')
          .then(res => {
            cy.wait('@upload-file')
              .its('response.statusCode')
              .should('equal', 200);
            expect(res?.statusCode).to.equal(200);
          });

        cy.findByRole('button', {
          name: /create another ticket/i,
        }).click();
        cy.contains(`${files.length} Files Selected`).should('not.exist');
      });
    });
  });
});
