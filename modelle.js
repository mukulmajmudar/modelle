define([], function()
{
    'use strict';

    class FetchError extends Error {}

    class HttpError extends Error
    {
        constructor(response)
        {
            super();
            this.response = response;
        }
    }


    /**
     * Wrapper over fetch() that throws exceptions on errors and parses JSON
     * responses.
     */
    async function fetch2(url, options)
    {
        options = Object.assign(
        {
            acceptableStatusCodes: [],
            parseResponse: true
        }, options);

        let response;
        try
        {
            response = await fetch(url, options);
        }
        catch(e)
        {
            // Handle fetch() network error exception (not 4xx or 5xx response)
            if (e instanceof TypeError && e.message === 'Failed to fetch')
            {
                throw new FetchError();
            }

            // Not fetch() error. Throw the exception again.
            throw e;
        }

        if (response.ok || options.acceptableStatusCodes.includes(response.status))
        {
            if (!options.parseResponse)
            {
                return response;
            }
            const contentType = response.headers.get('Content-Type');
            let parsedResponse;
            if (contentType.indexOf('application/json') === 0)
            {
                parsedResponse = await response.json();
            }
            else
            {
                parsedResponse = await response.text();
            }
            return parsedResponse;
        }    

        throw new HttpError(response);
    }

    class Model
    {
        constructor(attributes)
        {
            Object.assign(this, attributes);
        }


        getUrl()
        {
            throw new Error('not implemented');
        }


        getCollectionUrl()
        {
            throw new Error('not implemented');
        }


        getHeaders()
        {
            return {};
        }


        async fetch(attributes)
        {
            let url = await this.getUrl();
            if (attributes)
            {
                for (let attribute of attributes)
                {
                    url.searchParams.append('attributes', attribute);
                }
            }
            let response = await fetch2(url, {headers: this.getHeaders()});
            Object.assign(this, response);
            return this;
        }


        async fetchAttribute(attribute, defaultValue)
        {
            await this.fetch([attribute]);
            return this[attribute] ? this[attribute] : defaultValue;
        }


        async save()
        {
            if (!this.id)
            {
                await this._create();
            }
        }


        async _create()
        {
            let url = this.getCollectionUrl();
            let response = fetch2(url,
            {
                method: 'POST',
                headers: Object.assign(
                {
                    'Content-Type': 'application/json; charset=UTF-8'
                }, this.getHeaders()),
                body: JSON.stringify(this)
            });
            Object.assign(this, response);
        }
    }

    return {
        Model,
        fetch: fetch2,
        FetchError,
        HttpError
    };
});
