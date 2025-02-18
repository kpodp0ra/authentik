import {
    digestAlgorithmOptions,
    signatureAlgorithmOptions,
} from "@goauthentik/admin/applications/wizard/methods/saml/SamlProviderOptions";
import "@goauthentik/admin/common/ak-crypto-certificate-search";
import AkCryptoCertificateSearch from "@goauthentik/admin/common/ak-crypto-certificate-search";
import "@goauthentik/admin/common/ak-flow-search/ak-flow-search";
import { BaseProviderForm } from "@goauthentik/admin/providers/BaseProviderForm";
import { DEFAULT_CONFIG } from "@goauthentik/common/api/config";
import { first } from "@goauthentik/common/utils";
import "@goauthentik/elements/ak-dual-select/ak-dual-select-dynamic-selected-provider.js";
import { DualSelectPair } from "@goauthentik/elements/ak-dual-select/types.js";
import "@goauthentik/elements/forms/FormGroup";
import "@goauthentik/elements/forms/HorizontalFormElement";
import "@goauthentik/elements/forms/Radio";
import "@goauthentik/elements/forms/SearchSelect";
import "@goauthentik/elements/utils/TimeDeltaHelp";

import { msg } from "@lit/localize";
import { TemplateResult, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

import {
    FlowsInstancesListDesignationEnum,
    PropertymappingsApi,
    PropertymappingsProviderSamlListRequest,
    ProvidersApi,
    SAMLPropertyMapping,
    SAMLProvider,
    SpBindingEnum,
} from "@goauthentik/api";

export async function samlPropertyMappingsProvider(page = 1, search = "") {
    const propertyMappings = await new PropertymappingsApi(
        DEFAULT_CONFIG,
    ).propertymappingsProviderSamlList({
        ordering: "saml_name",
        pageSize: 20,
        search: search.trim(),
        page,
    });
    return {
        pagination: propertyMappings.pagination,
        options: propertyMappings.results.map((m) => [m.pk, m.name, m.name, m]),
    };
}

export function makeSAMLPropertyMappingsSelector(instanceMappings?: string[]) {
    const localMappings = instanceMappings ? new Set(instanceMappings) : undefined;
    return localMappings
        ? ([pk, _]: DualSelectPair) => localMappings.has(pk)
        : ([_0, _1, _2, mapping]: DualSelectPair<SAMLPropertyMapping>) =>
              mapping?.managed?.startsWith("goauthentik.io/providers/saml");
}

@customElement("ak-provider-saml-form")
export class SAMLProviderFormPage extends BaseProviderForm<SAMLProvider> {
    @state()
    hasSigningKp = false;

    async loadInstance(pk: number): Promise<SAMLProvider> {
        const provider = await new ProvidersApi(DEFAULT_CONFIG).providersSamlRetrieve({
            id: pk,
        });
        this.hasSigningKp = !!provider.signingKp;
        return provider;
    }

    async send(data: SAMLProvider): Promise<SAMLProvider> {
        if (this.instance) {
            return new ProvidersApi(DEFAULT_CONFIG).providersSamlUpdate({
                id: this.instance.pk,
                sAMLProviderRequest: data,
            });
        } else {
            return new ProvidersApi(DEFAULT_CONFIG).providersSamlCreate({
                sAMLProviderRequest: data,
            });
        }
    }

    renderForm(): TemplateResult {
        return html` <ak-form-element-horizontal label=${msg("Name")} ?required=${true} name="name">
                <input
                    type="text"
                    value="${ifDefined(this.instance?.name)}"
                    class="pf-c-form-control"
                    required
                />
            </ak-form-element-horizontal>
            <ak-form-element-horizontal
                label=${msg("Authorization flow")}
                required
                name="authorizationFlow"
            >
                <ak-flow-search
                    flowType=${FlowsInstancesListDesignationEnum.Authorization}
                    .currentFlow=${this.instance?.authorizationFlow}
                    required
                ></ak-flow-search>
                <p class="pf-c-form__helper-text">
                    ${msg("Flow used when authorizing this provider.")}
                </p>
            </ak-form-element-horizontal>

            <ak-form-group .expanded=${true}>
                <span slot="header"> ${msg("Protocol settings")} </span>
                <div slot="body" class="pf-c-form">
                    <ak-form-element-horizontal
                        label=${msg("ACS URL")}
                        ?required=${true}
                        name="acsUrl"
                    >
                        <input
                            type="text"
                            value="${ifDefined(this.instance?.acsUrl)}"
                            class="pf-c-form-control"
                            required
                        />
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Issuer")}
                        ?required=${true}
                        name="issuer"
                    >
                        <input
                            type="text"
                            value="${this.instance?.issuer || "authentik"}"
                            class="pf-c-form-control"
                            required
                        />
                        <p class="pf-c-form__helper-text">${msg("Also known as EntityID.")}</p>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Service Provider Binding")}
                        ?required=${true}
                        name="spBinding"
                    >
                        <ak-radio
                            .options=${[
                                {
                                    label: msg("Redirect"),
                                    value: SpBindingEnum.Redirect,
                                    default: true,
                                },
                                {
                                    label: msg("Post"),
                                    value: SpBindingEnum.Post,
                                },
                            ]}
                            .value=${this.instance?.spBinding}
                        >
                        </ak-radio>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "Determines how authentik sends the response back to the Service Provider.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal label=${msg("Audience")} name="audience">
                        <input
                            type="text"
                            value="${ifDefined(this.instance?.audience)}"
                            class="pf-c-form-control"
                        />
                    </ak-form-element-horizontal>
                </div>
            </ak-form-group>

            <ak-form-group>
                <span slot="header"> ${msg("Advanced flow settings")} </span>
                <div slot="body" class="pf-c-form">
                    <ak-form-element-horizontal
                        label=${msg("Authentication flow")}
                        ?required=${false}
                        name="authenticationFlow"
                    >
                        <ak-flow-search
                            flowType=${FlowsInstancesListDesignationEnum.Authentication}
                            .currentFlow=${this.instance?.authenticationFlow}
                        ></ak-flow-search>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "Flow used when a user access this provider and is not authenticated.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Invalidation flow")}
                        name="invalidationFlow"
                        required
                    >
                        <ak-flow-search
                            flowType=${FlowsInstancesListDesignationEnum.Invalidation}
                            .currentFlow=${this.instance?.invalidationFlow}
                            defaultFlowSlug="default-provider-invalidation-flow"
                            required
                        ></ak-flow-search>
                        <p class="pf-c-form__helper-text">
                            ${msg("Flow used when logging out of this provider.")}
                        </p>
                    </ak-form-element-horizontal>
                </div>
            </ak-form-group>

            <ak-form-group>
                <span slot="header"> ${msg("Advanced protocol settings")} </span>
                <div slot="body" class="pf-c-form">
                    <ak-form-element-horizontal
                        label=${msg("Signing Certificate")}
                        name="signingKp"
                    >
                        <ak-crypto-certificate-search
                            .certificate=${this.instance?.signingKp}
                            @input=${(ev: InputEvent) => {
                                const target = ev.target as AkCryptoCertificateSearch;
                                if (!target) return;
                                this.hasSigningKp = !!target.selectedKeypair;
                            }}
                        ></ak-crypto-certificate-search>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "Certificate used to sign outgoing Responses going to the Service Provider.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                    ${this.hasSigningKp
                        ? html` <ak-form-element-horizontal name="signAssertion">
                                  <label class="pf-c-switch">
                                      <input
                                          class="pf-c-switch__input"
                                          type="checkbox"
                                          ?checked=${first(this.instance?.signAssertion, true)}
                                      />
                                      <span class="pf-c-switch__toggle">
                                          <span class="pf-c-switch__toggle-icon">
                                              <i class="fas fa-check" aria-hidden="true"></i>
                                          </span>
                                      </span>
                                      <span class="pf-c-switch__label"
                                          >${msg("Sign assertions")}</span
                                      >
                                  </label>
                                  <p class="pf-c-form__helper-text">
                                      ${msg(
                                          "When enabled, the assertion element of the SAML response will be signed.",
                                      )}
                                  </p>
                              </ak-form-element-horizontal>
                              <ak-form-element-horizontal name="signResponse">
                                  <label class="pf-c-switch">
                                      <input
                                          class="pf-c-switch__input"
                                          type="checkbox"
                                          ?checked=${first(this.instance?.signResponse, false)}
                                      />
                                      <span class="pf-c-switch__toggle">
                                          <span class="pf-c-switch__toggle-icon">
                                              <i class="fas fa-check" aria-hidden="true"></i>
                                          </span>
                                      </span>
                                      <span class="pf-c-switch__label"
                                          >${msg("Sign responses")}</span
                                      >
                                  </label>
                                  <p class="pf-c-form__helper-text">
                                      ${msg(
                                          "When enabled, the assertion element of the SAML response will be signed.",
                                      )}
                                  </p>
                              </ak-form-element-horizontal>`
                        : nothing}
                    <ak-form-element-horizontal
                        label=${msg("Verification Certificate")}
                        name="verificationKp"
                    >
                        <ak-crypto-certificate-search
                            .certificate=${this.instance?.verificationKp}
                            nokey
                        ></ak-crypto-certificate-search>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "When selected, incoming assertion's Signatures will be validated against this certificate. To allow unsigned Requests, leave on default.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Encryption Certificate")}
                        name="encryptionKp"
                    >
                        <ak-crypto-certificate-search
                            .certificate=${this.instance?.encryptionKp}
                        ></ak-crypto-certificate-search>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "When selected, assertions will be encrypted using this keypair.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Property mappings")}
                        name="propertyMappings"
                    >
                        <ak-dual-select-dynamic-selected
                            .provider=${samlPropertyMappingsProvider}
                            .selector=${makeSAMLPropertyMappingsSelector(
                                this.instance?.propertyMappings,
                            )}
                            available-label=${msg("Available User Property Mappings")}
                            selected-label=${msg("Selected User Property Mappings")}
                        ></ak-dual-select-dynamic-selected>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("NameID Property Mapping")}
                        name="nameIdMapping"
                    >
                        <ak-search-select
                            .fetchObjects=${async (
                                query?: string,
                            ): Promise<SAMLPropertyMapping[]> => {
                                const args: PropertymappingsProviderSamlListRequest = {
                                    ordering: "saml_name",
                                };
                                if (query !== undefined) {
                                    args.search = query;
                                }
                                const items = await new PropertymappingsApi(
                                    DEFAULT_CONFIG,
                                ).propertymappingsProviderSamlList(args);
                                return items.results;
                            }}
                            .renderElement=${(item: SAMLPropertyMapping): string => {
                                return item.name;
                            }}
                            .value=${(
                                item: SAMLPropertyMapping | undefined,
                            ): string | undefined => {
                                return item?.pk;
                            }}
                            .selected=${(item: SAMLPropertyMapping): boolean => {
                                return this.instance?.nameIdMapping === item.pk;
                            }}
                            ?blankable=${true}
                        >
                        </ak-search-select>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "Configure how the NameID value will be created. When left empty, the NameIDPolicy of the incoming request will be respected.",
                            )}
                        </p>
                    </ak-form-element-horizontal>

                    <ak-form-element-horizontal
                        label=${msg("Assertion valid not before")}
                        ?required=${true}
                        name="assertionValidNotBefore"
                    >
                        <input
                            type="text"
                            value="${this.instance?.assertionValidNotBefore || "minutes=-5"}"
                            class="pf-c-form-control"
                            required
                        />
                        <p class="pf-c-form__helper-text">
                            ${msg("Configure the maximum allowed time drift for an assertion.")}
                        </p>
                        <ak-utils-time-delta-help></ak-utils-time-delta-help>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Assertion valid not on or after")}
                        ?required=${true}
                        name="assertionValidNotOnOrAfter"
                    >
                        <input
                            type="text"
                            value="${this.instance?.assertionValidNotOnOrAfter || "minutes=5"}"
                            class="pf-c-form-control"
                            required
                        />
                        <p class="pf-c-form__helper-text">
                            ${msg("Assertion not valid on or after current time + this value.")}
                        </p>
                        <ak-utils-time-delta-help></ak-utils-time-delta-help>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Session valid not on or after")}
                        ?required=${true}
                        name="sessionValidNotOnOrAfter"
                    >
                        <input
                            type="text"
                            value="${this.instance?.sessionValidNotOnOrAfter || "minutes=86400"}"
                            class="pf-c-form-control"
                            required
                        />
                        <p class="pf-c-form__helper-text">
                            ${msg("Session not valid on or after current time + this value.")}
                        </p>
                        <ak-utils-time-delta-help></ak-utils-time-delta-help>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Default relay state")}
                        ?required=${true}
                        name="defaultRelayState"
                    >
                        <input
                            type="text"
                            value="${this.instance?.defaultRelayState || ""}"
                            class="pf-c-form-control"
                            required
                        />
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "When using IDP-initiated logins, the relay state will be set to this value.",
                            )}
                        </p>
                        <ak-utils-time-delta-help></ak-utils-time-delta-help>
                    </ak-form-element-horizontal>

                    <ak-form-element-horizontal
                        label=${msg("Digest algorithm")}
                        ?required=${true}
                        name="digestAlgorithm"
                    >
                        <ak-radio
                            .options=${digestAlgorithmOptions}
                            .value=${this.instance?.digestAlgorithm}
                        >
                        </ak-radio>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Signature algorithm")}
                        ?required=${true}
                        name="signatureAlgorithm"
                    >
                        <ak-radio
                            .options=${signatureAlgorithmOptions}
                            .value=${this.instance?.signatureAlgorithm}
                        >
                        </ak-radio>
                    </ak-form-element-horizontal>
                </div>
            </ak-form-group>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-provider-saml-form": SAMLProviderFormPage;
    }
}
